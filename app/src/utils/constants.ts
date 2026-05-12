export const PROGRAM_ID = "BrtmpQXVMryfdrtTQLxFaJtSTa78nULPuxJcQfFznpQc";

export const RPC_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
export const RPC_WS_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_WS_URL ?? "wss://api.devnet.solana.com";

interface AssetConfig {
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
  {
    symbol: "jitoSOL",
    name: "Jito Staked SOL",
    mint: "H6khZJNhsAj3RNPrqUbVsYZUd2HFxeAQPrTXokuH57PZ",
    decimals: 9,
    logo: "",
    priceFeed: "7LwM3FQ4KvSfakMRscKDN6FjYFyFJ3MgjPmSm3KeCqKJ",
    ltv: 0.7,
    liquidationThreshold: 0.75,
    liquidationPenalty: 0.05,
  },
];

export const MOCK_PRICES: Record<string, number> = {
  SOL: 142.50,
  jitoSOL: 147.00,
  USDC: 1.0,
  ETH: 3200.0,
  BTC: 65000.0,
};
