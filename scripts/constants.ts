import { PublicKey } from "@solana/web3.js";

// ── Program ──────────────────────────────────────────────────────────────────
export const PROGRAM_ID = new PublicKey(
  "LiiLryA3sZtz3Qeuo3YjZE5tdq4zK6zHMPpwfHNqB8v"
);

// ── Cluster ──────────────────────────────────────────────────────────────────
export const CLUSTER = "devnet";
export const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";
export const WS_URL = process.env.WS_URL || "wss://api.devnet.solana.com";

// ── Seed prefixes (must match program/src/state.rs) ─────────────────────────
export const SEEDS = {
  PROTOCOL: Buffer.from("liilend-protocol"),
  VAULT: Buffer.from("liilend-vault"),
  USER: Buffer.from("liilend-user"),
  TREASURY: Buffer.from("liilend-treasury"),
  RESERVE: Buffer.from("liilend-reserve"),
  ORACLE: Buffer.from("liilend-oracle"),
  PRICE_FEED: Buffer.from("liilend-price-feed"),
  LIQUIDATION: Buffer.from("liilend-liquidation"),
} as const;

// ── Token mints (devnet) ─────────────────────────────────────────────────────
export const TOKEN_MINTS = {
  SOL: new PublicKey("So11111111111111111111111111111111111111112"),
  mSOL: new PublicKey("mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So"),
  jitoSOL: new PublicKey("H6khZJNhsAj3RNPrqUbVsYZUd2HFxeAQPrTXokuH57PZ"),
  ETH: new PublicKey("2b8PYsqmHcCHqM8JzvSf4CPuRxvZzaCbPx9PuENYQ9vB"),
  BTC: new PublicKey("CSQNTS5NCT6o3GsWt5gtkvW14tCVe9fpqdcQmepCBSAg"),
  USDC: new PublicKey("F88tFzVdURKCKzLWqGAu9omz5GsHAURbGcrrL4EK8CKZ"),
  USDT: new PublicKey("FHRiYWEh6Uzr8oc2i8TC29CVRTxYhkRkuSrmuFb67hjX"),
} as const;

// ── Pyth price feed accounts (devnet) ────────────────────────────────────────
export const PYTH_PRICE_FEEDS = {
  SOL: new PublicKey("H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG"),
  mSOL: new PublicKey("E4v1BBgYvKYToBiK6BFSETiEGmwTThNTEKZxKeKqYbTe"),
  jitoSOL: new PublicKey("7LwM3FQ4KvSfakMRscKDN6FjYFyFJ3MgjPmSm3KeCqKJ"),
  ETH: new PublicKey("JBu1AL4obBcCMgKvT2jWgYbR3bHjQkE5K8KxtH6Vx8H"),
  BTC: new PublicKey("Hr8Q8YJ6Uo3K5aY3G7bXMd3iJG9TjJxVdFm5YqUMgJF6"),
  USDC: new PublicKey("Dpw1EAVrSB1ibY1AStoA9C2yKF8F5wJNtBy2jVfXNU8V"),
  USDT: new PublicKey("Dpw1EAVrSB1ibY1AStoA9C2yKF8F5wJNtBy2jVfXNU8V"),
} as const;

// ── Switchboard price feed accounts (devnet) ─────────────────────────────────
export const SWITCHBOARD_PRICE_FEEDS = {
  SOL: new PublicKey("GvDMxPzTC1rBkH1sJ5nR1W1iKqW3YjVfV9KXoKbYpK7"),
  mSOL: new PublicKey("7LwM3FQ4KvSfakMRscKDN6FjYFyFJ3MgjPmSm3KeCqKJ"),
  jitoSOL: new PublicKey("8K5gXv4MxPzTC1rBkH1sJ5nR1W1iKqW3YjVfV9KXoKbY"),
  ETH: new PublicKey("9LwM3FQ4KvSfakMRscKDN6FjYFyFJ3MgjPmSm3KeCqKJ"),
  BTC: new PublicKey("3K5gXv4MxPzTC1rBkH1sJ5nR1W1iKqW3YjVfV9KXoKbY"),
  USDC: new PublicKey("5LwM3FQ4KvSfakMRscKDN6FjYFyFJ3MgjPmSm3KeCqKJ"),
  USDT: new PublicKey("7K5gXv4MxPzTC1rBkH1sJ5nR1W1iKqW3YjVfV9KXoKbY"),
} as const;

// ── Oracle sources ───────────────────────────────────────────────────────────
export enum OracleSource {
  Pyth = 0,
  Switchboard = 1,
}

export enum AssetType {
  Collateral = 0,
  Borrowable = 1,
  Both = 2,
}

// ── Asset configuration templates ────────────────────────────────────────────
export interface AssetConfigParams {
  mint: PublicKey;
  assetType: AssetType;
  decimals: number;
  maxLtvBps: number;
  liquidationThresholdBps: number;
  liquidationPenaltyBps: number;
  reserveFactorBps: number;
  depositCap: number;
  borrowCap: number;
  oracleSource: OracleSource;
  pythPriceFeed: PublicKey;
  switchboardPriceFeed: PublicKey;
}

export const ASSET_CONFIGS: AssetConfigParams[] = [
  {
    mint: TOKEN_MINTS.SOL,
    assetType: AssetType.Collateral,
    decimals: 9,
    maxLtvBps: 7500,
    liquidationThresholdBps: 8000,
    liquidationPenaltyBps: 500,
    reserveFactorBps: 1000,
    depositCap: 50_000 * 1e9,
    borrowCap: 0,
    oracleSource: OracleSource.Pyth,
    pythPriceFeed: PYTH_PRICE_FEEDS.SOL,
    switchboardPriceFeed: SWITCHBOARD_PRICE_FEEDS.SOL,
  },
  {
    mint: TOKEN_MINTS.mSOL,
    assetType: AssetType.Collateral,
    decimals: 9,
    maxLtvBps: 7000,
    liquidationThresholdBps: 7500,
    liquidationPenaltyBps: 500,
    reserveFactorBps: 1000,
    depositCap: 25_000 * 1e9,
    borrowCap: 0,
    oracleSource: OracleSource.Pyth,
    pythPriceFeed: PYTH_PRICE_FEEDS.mSOL,
    switchboardPriceFeed: SWITCHBOARD_PRICE_FEEDS.mSOL,
  },
  {
    mint: TOKEN_MINTS.jitoSOL,
    assetType: AssetType.Collateral,
    decimals: 9,
    maxLtvBps: 7000,
    liquidationThresholdBps: 7500,
    liquidationPenaltyBps: 500,
    reserveFactorBps: 1000,
    depositCap: 25_000 * 1e9,
    borrowCap: 0,
    oracleSource: OracleSource.Pyth,
    pythPriceFeed: PYTH_PRICE_FEEDS.jitoSOL,
    switchboardPriceFeed: SWITCHBOARD_PRICE_FEEDS.jitoSOL,
  },
  {
    mint: TOKEN_MINTS.ETH,
    assetType: AssetType.Collateral,
    decimals: 8,
    maxLtvBps: 7000,
    liquidationThresholdBps: 7500,
    liquidationPenaltyBps: 500,
    reserveFactorBps: 1000,
    depositCap: 500 * 1e8,
    borrowCap: 0,
    oracleSource: OracleSource.Pyth,
    pythPriceFeed: PYTH_PRICE_FEEDS.ETH,
    switchboardPriceFeed: SWITCHBOARD_PRICE_FEEDS.ETH,
  },
  {
    mint: TOKEN_MINTS.BTC,
    assetType: AssetType.Collateral,
    decimals: 8,
    maxLtvBps: 7000,
    liquidationThresholdBps: 7500,
    liquidationPenaltyBps: 500,
    reserveFactorBps: 1000,
    depositCap: 20 * 1e8,
    borrowCap: 0,
    oracleSource: OracleSource.Pyth,
    pythPriceFeed: PYTH_PRICE_FEEDS.BTC,
    switchboardPriceFeed: SWITCHBOARD_PRICE_FEEDS.BTC,
  },
  {
    mint: TOKEN_MINTS.USDC,
    assetType: AssetType.Both,
    decimals: 6,
    maxLtvBps: 0,
    liquidationThresholdBps: 1,
    liquidationPenaltyBps: 0,
    reserveFactorBps: 500,
    depositCap: 2_000_000 * 1e6,
    borrowCap: 1_500_000 * 1e6,
    oracleSource: OracleSource.Pyth,
    pythPriceFeed: PYTH_PRICE_FEEDS.USDC,
    switchboardPriceFeed: SWITCHBOARD_PRICE_FEEDS.USDC,
  },
  {
    mint: TOKEN_MINTS.USDT,
    assetType: AssetType.Borrowable,
    decimals: 6,
    maxLtvBps: 0,
    liquidationThresholdBps: 1,
    liquidationPenaltyBps: 0,
    reserveFactorBps: 500,
    depositCap: 0,
    borrowCap: 1_000_000 * 1e6,
    oracleSource: OracleSource.Pyth,
    pythPriceFeed: PYTH_PRICE_FEEDS.USDT,
    switchboardPriceFeed: SWITCHBOARD_PRICE_FEEDS.USDT,
  },
];

// ── Authority / multisig ─────────────────────────────────────────────────────
export const MULTISIG_AUTHORITY = process.env.MULTISIG_AUTHORITY
  ? new PublicKey(process.env.MULTISIG_AUTHORITY)
  : null;

// ── Deployer ──────────────────────────────────────────────────────────────────
export const DEPLOYER_KEYPAIR_PATH =
  process.env.DEPLOYER_KEYPAIR_PATH || "~/.config/solana/id.json";
export const PROGRAM_KEYPAIR_PATH = "target/deploy/liilend-keypair.json";

// ── Utility ───────────────────────────────────────────────────────────────────
export const SOL_AIRDROP_AMOUNT = 5;
export const TEST_WALLET_COUNT = 5;
export const TEST_WALLET_AIRDROP_AMOUNT = 2;
export const CONFIRMATION_TIMEOUT = 60_000;
