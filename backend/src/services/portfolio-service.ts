import { Connection, PublicKey } from "@solana/web3.js";
import { config } from "../config";
import { logger } from "../config/logger";
import {
  UserPosition,
  PortfolioSummary,
  PortfolioHistoryEntry,
  AssetSymbol,
} from "../types";
import { fxService } from "./fx-service";

function readPubkey(buf: Buffer, offset: number): PublicKey {
  return new PublicKey(buf.subarray(offset, offset + 32));
}

function readU128(buf: Buffer, offset: number): bigint {
  const lo = buf.readBigUInt64LE(offset);
  const hi = buf.readBigUInt64LE(offset + 8);
  return lo + (hi << 64n);
}

function readI64(buf: Buffer, offset: number): bigint {
  return buf.readBigInt64LE(offset);
}

const DISCRIMINATOR_SIZE = 8;

export class PortfolioService {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(config.solana.rpcUrl, "confirmed");
  }

  async getPortfolio(address: string): Promise<PortfolioSummary> {
    const positions = await this.fetchPositions(address);
    const usdRates = await this.getUsdRates();

    const enriched = positions.map((pos) => ({
      ...pos,
      depositedUsd: this.toUsd(pos.deposited, pos.asset, usdRates),
      borrowedUsd: this.toUsd(pos.borrowed, pos.asset, usdRates),
      collateralUsd: this.toUsd(pos.deposited, pos.asset, usdRates),
    }));

    const totalDeposited = enriched.reduce((s, p) => s + p.depositedUsd, 0);
    const totalBorrowed = enriched.reduce((s, p) => s + p.borrowedUsd, 0);
    const weightedHf = this.computeWeightedHealthFactor(enriched);

    return {
      address,
      totalDepositedUsd: totalDeposited,
      totalBorrowedUsd: totalBorrowed,
      netWorthUsd: totalDeposited - totalBorrowed,
      healthFactor: weightedHf,
      positions: enriched,
    };
  }

  async getHealthFactor(address: string): Promise<{
    healthFactor: number;
    totalCollateralUsd: number;
    totalDebtUsd: number;
    isHealthy: boolean;
  }> {
    const summary = await this.getPortfolio(address);
    const totalCollateral = summary.positions.reduce((s, p) => s + p.collateralUsd, 0);
    const totalDebt = summary.totalBorrowedUsd;
    const avgThreshold =
      totalCollateral > 0
        ? summary.positions.reduce((s, p) => s + p.liquidationThreshold * (p.collateralUsd / totalCollateral), 0)
        : 0;
    const denominator = totalDebt > 0 ? totalDebt : 1;
    const healthFactor = totalCollateral > 0 ? (totalCollateral * avgThreshold) / denominator : Infinity;
    return { healthFactor, totalCollateralUsd: totalCollateral, totalDebtUsd: totalDebt, isHealthy: healthFactor > 1.05 };
  }

  async getPortfolioHistory(address: string, days = 30): Promise<PortfolioHistoryEntry[]> {
    if (!config.database.supabaseUrl) return [];
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(config.database.supabaseUrl, config.database.supabaseServiceKey);
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      const { data, error } = await supabase
        .from("portfolio_history").select("*").eq("address", address).gte("timestamp", since)
        .order("timestamp", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        depositedUsd: row.deposited_usd, borrowedUsd: row.borrowed_usd,
        netWorthUsd: row.net_worth_usd, timestamp: new Date(row.timestamp),
      }));
    } catch (err) {
      logger.warn("Portfolio history fetch failed, returning empty", { address, error: err });
      return [];
    }
  }

  private async fetchPositions(address: string): Promise<UserPosition[]> {
    try {
      const pubkey = new PublicKey(address);
      const programId = new PublicKey(config.solana.programId);
      const accounts = await this.connection.getProgramAccounts(programId, {
        commitment: "confirmed",
        filters: [{ memcmp: { offset: 8, bytes: pubkey.toBase58() } }],
      });

      const positions: UserPosition[] = [];
      for (const acc of accounts) {
        const pos = this.tryDecodePosition(acc.account.data);
        if (pos) positions.push(pos);
      }
      return positions;
    } catch (err) {
      logger.warn("Failed to fetch on-chain positions", { address, error: err });
      return [];
    }
  }

  private tryDecodePosition(data: Buffer): UserPosition | null {
    if (data.length < DISCRIMINATOR_SIZE) return null;
    const d = data.subarray(DISCRIMINATOR_SIZE);

    // UserCollateralAccount: owner(32) + asset_mint(32) + shares(16) + deposit_ts(8) + bump(1) = 89 bytes
    if (d.length >= 89) {
      try {
        const owner = readPubkey(d, 0);
        const assetMint = readPubkey(d, 32);
        const shares = readU128(d, 64);
        return {
          market: assetMint.toBase58(),
          asset: this.mintToSymbol(assetMint),
          deposited: shares,
          depositedUsd: 0, borrowed: BigInt(0), borrowedUsd: 0, collateralUsd: 0,
          healthFactor: 2.0, liquidationThreshold: 0.8,
        };
      } catch {}
    }

    // BorrowPosition: owner(32) + borrow_mint(32) + debt_shares(16) + last_accrual(8) + borrow_ts(8) + bump(1) = 97 bytes
    if (d.length >= 97) {
      try {
        const owner = readPubkey(d, 0);
        const borrowMint = readPubkey(d, 32);
        const debtShares = readU128(d, 64);
        return {
          market: borrowMint.toBase58(),
          asset: this.mintToSymbol(borrowMint),
          deposited: BigInt(0), depositedUsd: 0,
          borrowed: debtShares, borrowedUsd: 0, collateralUsd: 0,
          healthFactor: 2.0, liquidationThreshold: 0.8,
        };
      } catch {}
    }

    return null;
  }

  private mintToSymbol(mint: PublicKey): AssetSymbol {
    const m = mint?.toBase58?.() || "";
    const map: Record<string, AssetSymbol> = {
      "So11111111111111111111111111111111111111112": "SOL",
      "F88tFzVdURKCKzLWqGAu9omz5GsHAURbGcrrL4EK8CKZ": "USDC",
      "FHRiYWEh6Uzr8oc2i8TC29CVRTxYhkRkuSrmuFb67hjX": "USDT",
      "H6khZJNhsAj3RNPrqUbVsYZUd2HFxeAQPrTXokuH57PZ": "JitoSOL",
    };
    return map[m] ?? ("SOL" as AssetSymbol);
  }

  private async getUsdRates(): Promise<Record<string, number>> {
    const rates = await fxService.getRates();
    const map: Record<string, number> = {};
    for (const r of rates) map[r.currency] = r.rateToUsd;
    return map;
  }

  private toUsd(amount: bigint, _asset: string, _rates: Record<string, number>): number {
    return Number(amount) / 1e9;
  }

  private computeWeightedHealthFactor(positions: UserPosition[]): number {
    const totalCollateral = positions.reduce((s, p) => s + p.collateralUsd, 0);
    const totalDebt = positions.reduce((s, p) => s + p.borrowedUsd, 0);
    if (totalDebt === 0) return Infinity;
    if (totalCollateral === 0) return 0;
    const avgThreshold = positions.reduce((s, p) => s + p.liquidationThreshold * (p.collateralUsd / totalCollateral), 0) / positions.length;
    return (totalCollateral * avgThreshold) / totalDebt;
  }
}

export const portfolioService = new PortfolioService();
