import { AssetConfig, FiatCurrency } from "@/types";

export const PROGRAM_ID = "LiiLryA3sZtz3Qeuo3YjZE5tdq4zK6zHMPpwfHNqB8v";

export const RPC_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
export const RPC_WS_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_WS_URL ?? "wss://api.devnet.solana.com";

export const LIILEND_REFERRAL = "LiiLend";

export const SUPPORTED_FIAT_CURRENCIES: {
  code: FiatCurrency;
  name: string;
  symbol: string;
  flag: string;
}[] = [
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", flag: "🇰🇪" },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", flag: "🇳🇬" },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "GH₵", flag: "🇬🇭" },
  { code: "ZAR", name: "South African Rand", symbol: "R", flag: "🇿🇦" },
  { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸" },
];

export const FIAT_TO_USD_RATE: Record<FiatCurrency, number> = {
  KES: 0.0077,
  NGN: 0.00063,
  GHS: 0.064,
  ZAR: 0.052,
  USD: 1.0,
};

export const SUPPORTED_ASSETS: AssetConfig[] = [
  {
    symbol: "SOL",
    name: "Solana",
    mint: "So11111111111111111111111111111111111111112",
    decimals: 9,
    logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
    priceFeed: "J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix",
    ltv: 0.75,
    liquidationThreshold: 0.8,
    liquidationPenalty: 0.05,
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    mint: "F88tFzVdURKCKzLWqGAu9omz5GsHAURbGcrrL4EK8CKZ",
    decimals: 6,
    logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
    priceFeed: "Dpw1EAVrSB1ibY1AStoA9C2yKF8F5wJNtBy2jVfXNU8V",
    ltv: 0,
    liquidationThreshold: 0.01,
    liquidationPenalty: 0,
  },
  {
    symbol: "ETH",
    name: "Ethereum (Wormhole)",
    mint: "2b8PYsqmHcCHqM8JzvSf4CPuRxvZzaCbPx9PuENYQ9vB",
    decimals: 8,
    logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs/logo.png",
    priceFeed: "JBu1AL4obBcCMgKvT2jWgYbR3bHjQkE5K8KxtH6Vx8H",
    ltv: 0.7,
    liquidationThreshold: 0.75,
    liquidationPenalty: 0.05,
  },
  {
    symbol: "BTC",
    name: "Bitcoin (Wormhole)",
    mint: "CSQNTS5NCT6o3GsWt5gtkvW14tCVe9fpqdcQmepCBSAg",
    decimals: 8,
    logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh/logo.png",
    priceFeed: "Hr8Q8YJ6Uo3K5aY3G7bXMd3iJG9TjJxVdFm5YqUMgJF6",
    ltv: 0.7,
    liquidationThreshold: 0.75,
    liquidationPenalty: 0.05,
  },
];

export const MOCK_PRICES: Record<string, number> = {
  SOL: 142.50,
  USDC: 1.0,
  ETH: 3200.0,
  BTC: 65000.0,
};
