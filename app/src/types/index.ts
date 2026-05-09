import { PublicKey } from "@solana/web3.js";

export type FiatCurrency = "KES" | "NGN" | "GHS" | "ZAR" | "USD";

export interface CollateralAsset {
  symbol: string;
  name: string;
  mint: PublicKey;
  decimals: number;
  logo: string;
  priceFeed: PublicKey;
  ltv: number; 
  liquidationThreshold: number; 
  liquidationPenalty: number; 
}

export interface LoanPosition {
  id: string;
  borrower: PublicKey;
  collateralMint: PublicKey;
  collateralAmount: bigint;
  borrowedFiat: number;
  fiatCurrency: FiatCurrency;
  collateralUsdValue: number;
  healthFactor: number;
  liquidationPrice: number;
  timestamp: number;
  active: boolean;
}

export interface ProtocolSummary {
  tvl: number;
  activeLoans: number;
  utilizationRate: number;
  totalBorrowed: number;
}

export interface TransactionRecord {
  signature: string;
  type: "deposit" | "withdraw" | "borrow" | "repay" | "liquidate";
  amount: number;
  currency: string;
  timestamp: number;
  status: "confirmed" | "pending" | "failed";
}

export interface AssetConfig {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  logo: string;
  priceFeed: string;
  ltv: number;
  liquidationThreshold: number;
  liquidationPenalty: number;
}

export interface BridgeQuote {
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  estimatedGas: string;
  fee: string;
  route: string;
}
