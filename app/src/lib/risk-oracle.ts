import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import { LIILEND_IDL } from "@/lib/idl";
import { RPC_ENDPOINT, SUPPORTED_ASSETS, MOCK_PRICES } from "@/utils/constants";
import {
  deriveProtocolStatePDA,
  deriveVaultPDA,
} from "@/lib/protocol";

function createReadonlyProgram() {
  const connection = new Connection(RPC_ENDPOINT, "confirmed");
  const provider = new AnchorProvider(
    connection,
    { publicKey: PublicKey.default } as any,
    { commitment: "confirmed" }
  );
  return new Program(LIILEND_IDL, provider);
}

export interface VaultRiskInfo {
  symbol: string;
  mint: string;
  tvlUsd: number;
  totalDepositsUnits: string;
  totalShares: string;
  totalValueRaw: string;
  priceUsd: number;
  ltv: number;
  liquidationThreshold: number;
  isActive: boolean;
}

export interface RiskOracleResponse {
  protocol: {
    totalDepositsUsd: string;
    totalBorrowsUsd: string;
    utilizationRate: number;
    vaultCount: number;
  };
  vaults: VaultRiskInfo[];
  updatedAt: string;
}

export async function getRiskData(): Promise<RiskOracleResponse> {
  const program = createReadonlyProgram();

  const [protocolPda] = deriveProtocolStatePDA();
  let protocolState: any = null;
  try {
    protocolState = await (program.account as any).protocolState.fetch(protocolPda);
  } catch {
    // Protocol may not be deployed yet
  }

  const collateralAssets = SUPPORTED_ASSETS.filter((a) => (a.ltv ?? 0) > 0);
  const vaults: VaultRiskInfo[] = [];

  for (const asset of collateralAssets) {
    const [vaultPda] = deriveVaultPDA(new PublicKey(asset.mint));
    let vault: any = null;
    try {
      vault = await (program.account as any).vaultAccount.fetch(vaultPda);
    } catch {
      continue;
    }

    const totalValueRaw = vault.totalValue?.toString() ?? "0";
    const totalShares = vault.totalShares?.toString() ?? "0";
    const priceUsd = MOCK_PRICES[asset.symbol] ?? 0;

    const collateralAssetsForUsd = asset.symbol === "USDC" || asset.symbol === "USDT"
      ? parseFloat(totalValueRaw) / 1_000_000
      : parseFloat(totalValueRaw) / Math.pow(10, asset.decimals);

    const tvlUsd = collateralAssetsForUsd * priceUsd;

    vaults.push({
      symbol: asset.symbol,
      mint: asset.mint,
      tvlUsd,
      totalDepositsUnits: collateralAssetsForUsd.toFixed(4),
      totalShares,
      totalValueRaw,
      priceUsd,
      ltv: asset.ltv ?? 0,
      liquidationThreshold: asset.liquidationThreshold ?? 0,
      isActive: vault.totalShares?.gt(new BN(0)) ?? false,
    });
  }

  const totalDepositsUsd = protocolState?.totalDepositsUsd
    ? (Number(protocolState.totalDepositsUsd.toString()) / 1_000_000).toFixed(2)
    : vaults.reduce((sum, v) => sum + v.tvlUsd, 0).toFixed(2);

  const totalBorrowsUsd = protocolState?.totalBorrowsUsd
    ? (Number(protocolState.totalBorrowsUsd.toString()) / 1_000_000).toFixed(2)
    : "0.00";

  const totalDepNum = parseFloat(totalDepositsUsd);
  const totalBorNum = parseFloat(totalBorrowsUsd);
  const utilizationRate = totalDepNum > 0 ? totalBorNum / totalDepNum : 0;

  return {
    protocol: {
      totalDepositsUsd,
      totalBorrowsUsd,
      utilizationRate: Math.round(utilizationRate * 10000) / 10000,
      vaultCount: vaults.length,
    },
    vaults,
    updatedAt: new Date().toISOString(),
  };
}
