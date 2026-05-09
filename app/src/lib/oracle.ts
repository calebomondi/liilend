import { Connection, PublicKey } from "@solana/web3.js";

export interface AssetPrice {
  price: number;
  confidence: number;
  decimals: number;
  emaPrice: number;
  timestamp: number;
  isStale: boolean;
  source: "pyth" | "switchboard";
}

const PYTH_PROGRAM_ID = new PublicKey("rec5ekMGkDxkjnFkqCdFXQqsEyYWTEb1upkymPdB9t8");
const SWITCHBOARD_PROGRAM_ID = new PublicKey("SW1TCH7qEPTdLsDHRgPmqAeKVkmR3uBjNs2bCpGLk4H");

const STALE_PRICE_THRESHOLD_MS = 60_000;

export const PYTH_PRICE_FEEDS: Record<string, string> = {
  SOL_USD: "7UVimffxr9ow1uXYxsr4LHAcV4mL2H7cRYE7mSthnD6o",
  USDC_USD: "Gnt27xtC47ZT9BsZ3P46j3EDcTcnK2K7GYFvz7NNEQN",
  ETH_USD: "JBu1AL4obBcCMqKBBxhpWCNUtEVijFedhMatH7oKiAP",
  BTC_USD: "GVXRSBjFk6e6J3NbVPXohDJetcTjaeeuykUpbQF8UoMU",
  USDT_USD: "3vxLTUzP3HHV6MFSHwmU4iH9K9ZMFBfmKxmbTn3Ntfih",
};

export const SWITCHBOARD_PRICE_FEEDS: Record<string, string> = {
  SOL_USD: "GvDMxPzN3sUpC1sMA6oD2Lr36qPmN6JfTCN5LfGxq5d",
  USDC_USD: "CZx29wkmzS6S6xeQK7Wz1BYQKLYDqMYPMqJqJvLGs3X",
  ETH_USD: "7VJs6nFegqDVFLFf66cPJGy2PewyXmYMTdMTRJA3RJZG",
};

function getPythConnection(): Connection {
  return new Connection(
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com"
  );
}

function parsePythPriceData(data: Buffer): { price: number; confidence: number; decimals: number; emaPrice: number; timestamp: number } {
  const priceExponent = data.readInt32LE(20);
  const priceRaw = Number(data.readBigUInt64LE(24));
  const confRaw = Number(data.readBigUInt64LE(32));
  const emaPriceRaw = Number(data.readBigUInt64LE(96));
  const publishSlot = Number(data.readBigUInt64LE(216));
  const decimals = -priceExponent;

  return {
    price: priceRaw * 10 ** priceExponent,
    confidence: confRaw * 10 ** priceExponent,
    decimals,
    emaPrice: emaPriceRaw * 10 ** priceExponent,
    timestamp: publishSlot,
  };
}

function parseSwitchboardPriceData(data: Buffer): { price: number; confidence: number; decimals: number; timestamp: number } {
  const decimals = data.readUInt32LE(32);
  const priceRaw = Number(data.readBigUInt64LE(8));
  const confRaw = Number(data.readBigUInt64LE(16));
  const timestamp = Number(data.readBigUInt64LE(40));

  return {
    price: priceRaw / 10 ** decimals,
    confidence: confRaw / 10 ** decimals,
    decimals,
    timestamp,
  };
}

export async function getAssetPrice(
  assetSymbol: string,
  connection?: Connection
): Promise<AssetPrice> {
  const conn = connection ?? getPythConnection();
  const pythFeedKey = PYTH_PRICE_FEEDS[assetSymbol];

  if (pythFeedKey) {
    try {
      return await getPriceFromPyth(pythFeedKey, conn);
    } catch {
      const sbFeedKey = SWITCHBOARD_PRICE_FEEDS[assetSymbol];
      if (sbFeedKey) {
        return getPriceFromSwitchboard(sbFeedKey, conn);
      }
      throw new Error(`No price feed available for ${assetSymbol}`);
    }
  }

  const sbFeedKey = SWITCHBOARD_PRICE_FEEDS[assetSymbol];
  if (sbFeedKey) {
    return getPriceFromSwitchboard(sbFeedKey, conn);
  }

  throw new Error(`Unknown asset: ${assetSymbol}`);
}

async function getPriceFromPyth(
  feedAddress: string,
  connection: Connection
): Promise<AssetPrice> {
  const accountInfo = await connection.getAccountInfo(new PublicKey(feedAddress));
  if (!accountInfo) {
    throw new Error(`Pyth price account not found: ${feedAddress}`);
  }

  const { price, confidence, decimals, emaPrice, timestamp } = parsePythPriceData(accountInfo.data);
  const now = Date.now() / 1000;
  const isStale = now - timestamp > STALE_PRICE_THRESHOLD_MS / 1000;

  return { price, confidence, decimals, emaPrice, timestamp, isStale, source: "pyth" };
}

async function getPriceFromSwitchboard(
  feedAddress: string,
  connection: Connection
): Promise<AssetPrice> {
  const accountInfo = await connection.getAccountInfo(new PublicKey(feedAddress));
  if (!accountInfo) {
    throw new Error(`Switchboard price account not found: ${feedAddress}`);
  }

  const { price, confidence, decimals, timestamp } = parseSwitchboardPriceData(accountInfo.data);
  const now = Date.now() / 1000;
  const isStale = now - timestamp > STALE_PRICE_THRESHOLD_MS / 1000;

  return { price, confidence, decimals, emaPrice: price, timestamp, isStale, source: "switchboard" };
}

export async function getPriceWithConfidence(
  assetSymbol: string,
  connection?: Connection
): Promise<{ price: AssetPrice; confidenceInterval: [number, number] }> {
  const price = await getAssetPrice(assetSymbol, connection);
  const lower = price.price - price.confidence;
  const upper = price.price + price.confidence;

  return { price, confidenceInterval: [lower, upper] };
}

export function isPriceStale(price: AssetPrice): boolean {
  return price.isStale;
}
