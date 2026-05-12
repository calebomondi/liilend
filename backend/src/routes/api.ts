import { Router, Request, Response } from "express";
import { PublicKey, Connection } from "@solana/web3.js";
import { config } from "../config";
import { logger } from "../config/logger";
import { fxService } from "../services/fx-service";
import { indexerService } from "../services/indexer";
import { liquidationMonitor } from "../services/liquidation-monitor";
import { portfolioService } from "../services/portfolio-service";
import { authMiddleware, createToken, verifySignedMessage } from "../middleware/auth";
import { ApiResponse, AnalyticsOverview, ConversionRequest, FiatCurrency, ProtocolStats } from "../types";
import { z } from "zod";

const router = Router();

/* ─── Helpers ────────────────────────────────────────────── */

function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data, timestamp: new Date() };
}

function err(msg: string): ApiResponse {
  return { success: false, error: msg, timestamp: new Date() };
}

/* ─── Health ─────────────────────────────────────────────── */

router.get("/health", (_req: Request, res: Response<ApiResponse>) => {
  res.json(
    ok({
      status: "ok",
      uptime: process.uptime(),
      environment: config.server.nodeEnv,
      timestamp: new Date().toISOString(),
    })
  );
});

/* ─── Protocol ───────────────────────────────────────────── */

function derivePda(seeds: Buffer[]): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(seeds, new PublicKey(config.solana.programId));
  return pda;
}

router.get(
  "/protocol/stats",
  async (_req: Request, res: Response<ApiResponse>) => {
    try {
      const conn = new Connection(config.solana.rpcUrl, { commitment: "confirmed", wsEndpoint: config.solana.wsUrl });
      const programId = new PublicKey(config.solana.programId);
      const protocolPda = derivePda([Buffer.from("liilend-protocol")]);

      const accountInfo = await conn.getAccountInfo(protocolPda);
      if (!accountInfo) throw new Error("Protocol state not found");

      const d = accountInfo.data.subarray(8); // skip discriminator
      const totalDepositsUsd = Number(d.readBigUInt64LE(80)) + (Number(d.readBigUInt64LE(88)) << 64); // u128
      const totalBorrowsUsd = Number(d.readBigUInt64LE(96)) + (Number(d.readBigUInt64LE(104)) << 64);

      const stats: ProtocolStats = {
        tvlUsd: totalDepositsUsd / 1e6,
        totalBorrowsUsd: totalBorrowsUsd / 1e6,
        totalDepositsUsd: totalDepositsUsd / 1e6,
        utilizationRate: totalDepositsUsd > 0 ? (totalBorrowsUsd / totalDepositsUsd) * 100 : 0,
        activeUsers: 0,
        totalMarkets: 7,
        updatedAt: new Date(),
      };

      res.json(ok<ProtocolStats>(stats));
    } catch (error) {
      logger.error("Failed to fetch protocol stats", { error });
      res.status(500).json(err("Failed to fetch protocol stats"));
    }
  }
);

/* ─── User ───────────────────────────────────────────────── */

router.get(
  "/user/:address/portfolio",
  async (
    req: Request<{ address: string }>,
    res: Response<ApiResponse>
  ) => {
    try {
      const { address } = req.params;
      const portfolio = await portfolioService.getPortfolio(address);
      res.json(ok(portfolio));
    } catch (error) {
      logger.error("Portfolio fetch failed", { error });
      res.status(500).json(err("Failed to fetch portfolio"));
    }
  }
);

router.get(
  "/user/:address/health",
  async (
    req: Request<{ address: string }>,
    res: Response<ApiResponse>
  ) => {
    try {
      const { address } = req.params;
      const health = await portfolioService.getHealthFactor(address);
      res.json(ok(health));
    } catch (error) {
      logger.error("Health factor fetch failed", { error });
      res.status(500).json(err("Failed to fetch health factor"));
    }
  }
);

/* ─── FX ─────────────────────────────────────────────────── */

router.get(
  "/fx/rates",
  async (_req: Request, res: Response<ApiResponse>) => {
    try {
      const rates = await fxService.getRates();
      res.json(ok(rates));
    } catch (error) {
      logger.error("FX rates fetch failed", { error });
      res.status(502).json(err("Failed to fetch FX rates"));
    }
  }
);

const convertQuerySchema = z.object({
  from: z.enum(["KES", "NGN", "GHS", "ZAR", "USD"]),
  to: z.enum(["KES", "NGN", "GHS", "ZAR", "USD"]),
  amount: z.coerce.number().positive(),
});

router.get(
  "/fx/convert",
  async (
    req: Request<{}, {}, {}, { from: string; to: string; amount: string }>,
    res: Response<ApiResponse>
  ) => {
    try {
      const parsed = convertQuerySchema.parse(req.query);
      const result = await fxService.convert(parsed as ConversionRequest);
      res.json(ok(result));
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json(err(error.errors[0].message));
        return;
      }
      logger.error("FX conversion failed", { error });
      res.status(502).json(err("Conversion failed"));
    }
  }
);

/* ─── Notifications ──────────────────────────────────────── */

const registerSchema = z.object({
  address: z.string().min(32).max(44),
  channel: z.enum(["email", "telegram", "webhook"]),
  target: z.string().min(1),
  events: z.array(z.enum(["deposit", "withdraw", "borrow", "repay", "liquidate"])),
  enabled: z.boolean().default(true),
});

router.post(
  "/notifications/register",
  async (
    req: Request,
    res: Response<ApiResponse>
  ) => {
    try {
      if (!config.database.supabaseUrl) {
        res.status(501).json(err("Database not configured"));
        return;
      }
      const body = registerSchema.parse(req.body);
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        config.database.supabaseUrl,
        config.database.supabaseServiceKey
      );

      const { data, error } = await supabase
        .from("notification_registrations")
        .upsert(body, { onConflict: "address" })
        .select()
        .single();

      if (error) throw error;

      logger.info("Notification registered", { address: body.address });
      res.status(201).json(ok(data));
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json(err(error.errors[0].message));
        return;
      }
      logger.error("Notification registration failed", { error });
      res.status(500).json(err("Registration failed"));
    }
  }
);

/* ─── Analytics ──────────────────────────────────────────── */

router.get(
  "/analytics/overview",
  async (_req: Request, res: Response<ApiResponse>) => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
      let totalTx: number | null = 0;
      let totalLiq: number | null = 0;

      if (config.database.supabaseUrl) {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(
          config.database.supabaseUrl,
          config.database.supabaseServiceKey
        );

        const { count: tx } = await supabase
          .from("events")
          .select("*", { count: "exact", head: true })
          .gte("block_time", thirtyDaysAgo);
        totalTx = tx;

        const { count: liq } = await supabase
          .from("events")
          .select("*", { count: "exact", head: true })
          .eq("action", "liquidate")
          .gte("block_time", thirtyDaysAgo);
        totalLiq = liq;
      }

      const overview: AnalyticsOverview = {
        dailyActiveUsers: 0,
        weeklyActiveUsers: 0,
        monthlyActiveUsers: 0,
        totalTransactions: totalTx ?? 0,
        uniqueDepositors: 0,
        uniqueBorrowers: 0,
        avgLoanSizeUsd: 0,
        totalLiquidations: totalLiq ?? 0,
        liquidationVolumeUsd: 0,
        revenueGeneratedUsd: 0,
        periodStart: new Date(thirtyDaysAgo),
        periodEnd: new Date(),
      };

      res.json(ok<AnalyticsOverview>(overview));
    } catch (error) {
      logger.error("Analytics overview failed", { error });
      res.status(500).json(err("Failed to fetch analytics"));
    }
  }
);

/* ─── Liquidations ───────────────────────────────────────── */

router.get(
  "/liquidations/pending",
  async (_req: Request, res: Response<ApiResponse>) => {
    try {
      const pending = liquidationMonitor.getPendingLiquidations();
      res.json(ok(pending));
    } catch (error) {
      logger.error("Pending liquidations fetch failed", { error });
      res.status(500).json(err("Failed to fetch pending liquidations"));
    }
  }
);

/* ─── Auth ───────────────────────────────────────────────── */

const loginSchema = z.object({
  address: z.string().min(32).max(44),
  signedMessage: z.string().min(1),
  timestamp: z.number().positive(),
});

router.post(
  "/auth/login",
  async (
    req: Request,
    res: Response<ApiResponse>
  ) => {
    try {
      const body = loginSchema.parse(req.body);

      if (!verifySignedMessage(body)) {
        res.status(401).json(err("Invalid or expired signed message"));
        return;
      }

      const token = createToken(body.address);
      res.json(ok(token));
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json(err(error.errors[0].message));
        return;
      }
      logger.error("Login failed", { error });
      res.status(500).json(err("Login failed"));
    }
  }
);

export default router;
