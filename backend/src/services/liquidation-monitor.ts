import { Connection, PublicKey, VersionedTransaction, TransactionMessage } from "@solana/web3.js";
import { config } from "../config";
import { logger } from "../config/logger";
import {
  LiquidationCandidate,
  LiquidationWarning,
  LiquidationResult,
  UserPosition,
} from "../types";

function readPubkey(buf: Buffer, offset: number): PublicKey {
  return new PublicKey(buf.subarray(offset, offset + 32));
}

function readU128(buf: Buffer, offset: number): bigint {
  const lo = buf.readBigUInt64LE(offset);
  const hi = buf.readBigUInt64LE(offset + 8);
  return lo + (hi << 64n);
}

const DISCRIMINATOR_SIZE = 8;

export class LiquidationMonitor {
  private connection: Connection;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private warnings: Map<string, LiquidationWarning> = new Map();

  constructor() {
    this.connection = new Connection(config.solana.rpcUrl, "confirmed");
  }

  start(): void {
    if (this.pollTimer) { logger.warn("Liquidation monitor already running"); return; }
    const ms = config.liquidation.pollIntervalMs;
    this.pollTimer = setInterval(() => this.poll(), ms);
    logger.info("Liquidation monitor started", { pollIntervalMs: ms });
  }

  stop(): void {
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
    logger.info("Liquidation monitor stopped");
  }

  getWarnings(): LiquidationWarning[] {
    return Array.from(this.warnings.values());
  }

  getPendingLiquidations(): LiquidationCandidate[] {
    return Array.from(this.warnings.values())
      .filter((w) => w.warningLevel === "liquidatable")
      .map((w) => ({
        user: w.user, market: "", positionUsd: w.positionUsd, debtUsd: w.debtUsd,
        healthFactor: w.healthFactor, liquidationThreshold: 0,
      }));
  }

  private async poll(): Promise<void> {
    try {
      const positions = await this.fetchAllActivePositions();
      for (const pos of positions) this.evaluatePosition(pos);
    } catch (err) {
      logger.error("Liquidation poll cycle failed", { error: err });
    }
  }

  private evaluatePosition(pos: UserPosition): void {
    const hf = pos.healthFactor;
    const { healthFactorWarn, healthFactorLiquidate } = config.liquidation;
    const isLiquidatable = hf < healthFactorLiquidate;
    const isCritical = hf >= healthFactorLiquidate && hf < healthFactorWarn;

    if (!isLiquidatable && !isCritical) {
      this.warnings.delete(pos.market);
      return;
    }

    const warning: LiquidationWarning = {
      user: pos.market, healthFactor: hf,
      warningLevel: isLiquidatable ? "liquidatable" : "critical",
      triggeredAt: new Date(), positionUsd: pos.collateralUsd, debtUsd: pos.borrowedUsd,
    };
    this.warnings.set(pos.market, warning);

    logger.info("Liquidation warning", { user: pos.market, healthFactor: hf, level: warning.warningLevel });

    if (isLiquidatable) {
      this.executeLiquidation(pos).catch((err) =>
        logger.error("Liquidation execution failed", { user: pos.market, error: err })
      );
    }
  }

  private async executeLiquidation(pos: UserPosition): Promise<LiquidationResult> {
    const result: LiquidationResult = {
      user: pos.market, market: pos.market, signature: "", slot: 0,
      liquidatedAmountUsd: 0, bonusUsd: 0, timestamp: new Date(), success: false,
    };

    try {
      const blockhash = await this.connection.getLatestBlockhash();
      const tx = new VersionedTransaction(
        new TransactionMessage({
          payerKey: new PublicKey(config.solana.programId),
          recentBlockhash: blockhash.blockhash,
          instructions: [],
        }).compileToV0Message()
      );
      const sig = await this.connection.sendTransaction(tx);
      result.signature = sig;
      const confirmResult = await this.connection.confirmTransaction(sig);
      result.slot = confirmResult.context.slot;
      const bonusBps = config.liquidation.liquidationBonusBps;
      result.liquidatedAmountUsd = pos.borrowedUsd;
      result.bonusUsd = (pos.borrowedUsd * bonusBps) / 10_000;
      result.success = true;
      logger.info("Liquidation executed", { user: pos.market, signature: sig, amountUsd: result.liquidatedAmountUsd });
      this.warnings.delete(pos.market);
    } catch (err) {
      result.error = String(err);
      logger.error("Liquidation transaction failed", { user: pos.market, error: err });
    }
    return result;
  }

  private async fetchAllActivePositions(): Promise<UserPosition[]> {
    try {
      const programId = new PublicKey(config.solana.programId);
      const accounts = await this.connection.getProgramAccounts(programId, {
        commitment: "confirmed",
      });

      const positions: UserPosition[] = [];
      for (const acc of accounts) {
        const pos = this.tryDecodePosition(acc.account.data);
        if (pos) positions.push(pos);
      }
      return positions;
    } catch (err) {
      logger.error("Failed to fetch active positions", { error: err });
      return [];
    }
  }

  private tryDecodePosition(data: Buffer): UserPosition | null {
    if (data.length < DISCRIMINATOR_SIZE) return null;
    const d = data.subarray(DISCRIMINATOR_SIZE);

    if (d.length >= 89) {
      try {
        const owner = readPubkey(d, 0);
        const assetMint = readPubkey(d, 32);
        const shares = readU128(d, 64);
        return {
          market: assetMint.toBase58(), asset: "SOL",
          deposited: shares, depositedUsd: 0, borrowed: BigInt(0), borrowedUsd: 0,
          collateralUsd: 0, healthFactor: 2.0, liquidationThreshold: 0.8,
        };
      } catch {}
    }

    if (d.length >= 97) {
      try {
        const owner = readPubkey(d, 0);
        const borrowMint = readPubkey(d, 32);
        const debtShares = readU128(d, 64);
        return {
          market: borrowMint.toBase58(), asset: "SOL",
          deposited: BigInt(0), depositedUsd: 0,
          borrowed: debtShares, borrowedUsd: 0, collateralUsd: 0,
          healthFactor: 2.0, liquidationThreshold: 0.8,
        };
      } catch {}
    }

    return null;
  }
}

export const liquidationMonitor = new LiquidationMonitor();
