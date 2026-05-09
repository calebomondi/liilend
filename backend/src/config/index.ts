import dotenv from "dotenv";
import { LiquidationConfig } from "../types";

dotenv.config();

function env(key: string, fallback?: string): string {
  const val = process.env[key] ?? fallback;
  if (val === undefined || val === null) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function envInt(key: string, fallback: number): number {
  const raw = process.env[key];
  return raw ? parseInt(raw, 10) : fallback;
}

function envFloat(key: string, fallback: number): number {
  const raw = process.env[key];
  return raw ? parseFloat(raw) : fallback;
}

function envList(key: string, fallback: string[]): string[] {
  const raw = process.env[key];
  return raw ? raw.split(",").map((s) => s.trim()) : fallback;
}

export const config = {
  server: {
    port: envInt("PORT", 4000),
    host: env("HOST", "0.0.0.0"),
    nodeEnv: env("NODE_ENV", "development"),
  },

  solana: {
    rpcUrl: env("SOLANA_RPC_URL", "https://api.devnet.solana.com"),
    wsUrl: env("SOLANA_WS_URL", "wss://api.devnet.solana.com"),
    programId: env("PROGRAM_ID"),
  },

  database: {
    supabaseUrl: env("SUPABASE_URL", ""),
    supabaseServiceKey: env("SUPABASE_SERVICE_KEY", ""),
  },

  redis: {
    url: env("REDIS_URL", "redis://localhost:6379"),
  },

  fx: {
    oracleUrl: env("FX_ORACLE_URL", "https://api.switchboard.xyz/v2"),
    cacheTtlSeconds: envInt("FX_CACHE_TTL_SECONDS", 300),
    fallbackUrls: envList("FX_FALLBACK_URLS", [
      "https://api.exchangerate-api.com/v4/latest/USD",
      "https://open.er-api.com/v6/latest/USD",
    ]),
  },

  liquidation: {
    healthFactorWarn: envFloat("HEALTH_FACTOR_WARN", 1.15),
    healthFactorLiquidate: envFloat("HEALTH_FACTOR_LIQUIDATE", 1.05),
    liquidationBonusBps: envInt("LIQUIDATION_BONUS_BPS", 500),
    pollIntervalMs: envInt("LIQUIDATION_POLL_INTERVAL_MS", 10_000),
  } satisfies LiquidationConfig,

  auth: {
    jwtSecret: env("JWT_SECRET", "dev-secret-change-in-production"),
    signedMessageValiditySeconds: envInt(
      "SIGNED_MESSAGE_VALIDITY_SECONDS",
      300
    ),
  },

  logging: {
    level: env("LOG_LEVEL", "info"),
    format: env("LOG_FORMAT", "combined"),
  },

  queue: {
    indexerConcurrency: envInt("QUEUE_INDEXER_CONCURRENCY", 5),
    liquidationConcurrency: envInt("QUEUE_LIQUIDATION_CONCURRENCY", 3),
  },
} as const;

export type Config = typeof config;
