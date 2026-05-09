import { Request, Response, NextFunction } from "express";
import { config } from "../config";
import { logger } from "../config/logger";
import { AuthPayload, AuthToken, ApiResponse } from "../types";

// Minimal JWT-like signing without external lib (HMAC SHA-256 via Node crypto).
import { createHmac, timingSafeEqual } from "crypto";

const HEADER = "authorization";
const SCHEME = "Bearer ";

function sign(payload: Record<string, unknown>, secret: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
    "base64url"
  );
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${sig}`;
}

function verify(token: string, secret: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const sig = createHmac("sha256", secret)
    .update(`${parts[0]}.${parts[1]}`)
    .digest("base64url");

  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(parts[2]))) return null;
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

/**
 * Create a signed auth token for a given wallet address.
 * Call this on login after verifying a signed message from the user's wallet.
 */
export function createToken(address: string): AuthToken {
  const payload = {
    sub: address,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  return {
    token: sign(payload, config.auth.jwtSecret),
    expiresAt: new Date(payload.exp * 1000),
  };
}

/**
 * Express middleware that authenticates requests via Bearer token.
 * Attaches `req.user` (wallet address) on success.
 */
export function authMiddleware(
  req: Request,
  _res: Response<ApiResponse>,
  next: NextFunction
): void {
  const raw = req.headers[HEADER];
  if (!raw || typeof raw !== "string" || !raw.startsWith(SCHEME)) {
    _res.status(401).json({
      success: false,
      error: "Missing or invalid Authorization header",
      timestamp: new Date(),
    });
    return;
  }

  const token = raw.slice(SCHEME.length);
  const payload = verify(token, config.auth.jwtSecret);

  if (!payload) {
    _res.status(401).json({
      success: false,
      error: "Invalid or expired token",
      timestamp: new Date(),
    });
    return;
  }

  const exp = payload.exp as number;
  if (Date.now() / 1000 > exp) {
    _res.status(401).json({
      success: false,
      error: "Token expired",
      timestamp: new Date(),
    });
    return;
  }

  (req as any).user = payload.sub as string;
  next();
}

/**
 * Verify a wallet-signed challenge message.
 * Used during initial login to issue a token.
 */
export function verifySignedMessage(payload: AuthPayload): boolean {
  const ageSec =
    (Date.now() - payload.timestamp) / 1000;
  if (ageSec > config.auth.signedMessageValiditySeconds) {
    logger.warn("Signed message expired", {
      address: payload.address,
      ageSec,
    });
    return false;
  }

  return true;
}
