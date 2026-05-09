import { PublicKey } from "@solana/web3.js";

/* ─── Protocol ─────────────────────────────────────────── */

export type Chain = "solana";

export type AssetSymbol = "SOL" | "USDC" | "USDT" | "JitoSOL" | "mSOL" | "bSOL";

export type FiatCurrency = "USD" | "KES" | "NGN" | "GHS" | "ZAR";

export type ProtocolAction =
  | "deposit"
  | "withdraw"
  | "borrow"
  | "repay"
  | "liquidate";

export interface ProtocolStats {
  tvlUsd: number;
  totalBorrowsUsd: number;
  totalDepositsUsd: number;
  utilizationRate: number;
  activeUsers: number;
  totalMarkets: number;
  updatedAt: Date;
}

/* ─── User / Portfolio ──────────────────────────────────── */

export interface UserPosition {
  market: string;
  asset: AssetSymbol;
  deposited: bigint;
  depositedUsd: number;
  borrowed: bigint;
  borrowedUsd: number;
  collateralUsd: number;
  healthFactor: number;
  liquidationThreshold: number;
}

export interface PortfolioSummary {
  address: string;
  totalDepositedUsd: number;
  totalBorrowedUsd: number;
  netWorthUsd: number;
  healthFactor: number;
  positions: UserPosition[];
}

export interface PortfolioHistoryEntry {
  timestamp: Date;
  depositedUsd: number;
  borrowedUsd: number;
  netWorthUsd: number;
}

/* ─── FX ────────────────────────────────────────────────── */

export interface FxRate {
  currency: FiatCurrency;
  rateToUsd: number;
  timestamp: Date;
  source: "oracle" | "fallback" | "cache";
}

export interface FxCacheEntry {
  rates: Record<FiatCurrency, number>;
  timestamp: number;
}

export interface ConversionRequest {
  from: FiatCurrency;
  to: FiatCurrency;
  amount: number;
}

export interface ConversionResult {
  from: FiatCurrency;
  to: FiatCurrency;
  inputAmount: number;
  outputAmount: number;
  rate: number;
  timestamp: Date;
}

/* ─── Indexer ───────────────────────────────────────────── */

export interface IndexedEvent {
  id: string;
  signature: string;
  slot: number;
  blockTime: Date;
  action: ProtocolAction;
  user: string;
  market: string;
  amount: bigint;
  amountUsd: number;
  data: Record<string, unknown>;
}

export interface IndexerState {
  lastProcessedSlot: number;
  lastProcessedSignature: string | null;
  isRunning: boolean;
  processedCount: number;
}

/* ─── Liquidation ───────────────────────────────────────── */

export interface LiquidationCandidate {
  user: string;
  market: string;
  positionUsd: number;
  debtUsd: number;
  healthFactor: number;
  liquidationThreshold: number;
}

export interface LiquidationWarning {
  user: string;
  healthFactor: number;
  warningLevel: "warning" | "critical" | "liquidatable";
  triggeredAt: Date;
  positionUsd: number;
  debtUsd: number;
}

export interface LiquidationResult {
  user: string;
  market: string;
  signature: string;
  slot: number;
  liquidatedAmountUsd: number;
  bonusUsd: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export interface LiquidationConfig {
  healthFactorWarn: number;
  healthFactorLiquidate: number;
  liquidationBonusBps: number;
  pollIntervalMs: number;
}

/* ─── Auth / Notifications ──────────────────────────────── */

export interface AuthPayload {
  address: string;
  signedMessage: string;
  timestamp: number;
}

export interface AuthToken {
  token: string;
  expiresAt: Date;
}

export interface NotificationRegistration {
  address: string;
  channel: "email" | "telegram" | "webhook";
  target: string;
  events: ProtocolAction[];
  enabled: boolean;
}

/* ─── Analytics ──────────────────────────────────────────── */

export interface AnalyticsOverview {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  totalTransactions: number;
  uniqueDepositors: number;
  uniqueBorrowers: number;
  avgLoanSizeUsd: number;
  totalLiquidations: number;
  liquidationVolumeUsd: number;
  revenueGeneratedUsd: number;
  periodStart: Date;
  periodEnd: Date;
}

/* ─── API Responses ──────────────────────────────────────── */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page: number;
  limit: number;
  total: number;
}
