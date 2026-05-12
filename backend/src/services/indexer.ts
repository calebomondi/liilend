import { Connection, PublicKey } from "@solana/web3.js";
import { BorshCoder, Idl } from "@coral-xyz/anchor";
import { config } from "../config";
import { logger } from "../config/logger";
import {
  IndexedEvent,
  IndexerState,
  ProtocolAction,
  FiatCurrency,
} from "../types";
import { fxService } from "./fx-service";

const PROGRAM_LOG_PREFIX = "Program log: ";

const ACTION_MAP: Record<string, ProtocolAction> = {
  deposit: "deposit",
  withdraw: "withdraw",
  borrow: "borrow",
  repay: "repay",
  liquidate: "liquidate",
};

export class IndexerService {
  private connection: Connection;
  private state: IndexerState;
  private subscriptionId: number | null = null;

  constructor() {
    this.connection = new Connection(config.solana.rpcUrl, {
      commitment: "confirmed",
      wsEndpoint: config.solana.wsUrl,
    });
    this.state = {
      lastProcessedSlot: 0,
      lastProcessedSignature: null,
      isRunning: false,
      processedCount: 0,
    };
  }

  getState(): IndexerState {
    return { ...this.state };
  }

  /** Start listening for program events via logs subscription. */
  async start(): Promise<void> {
    if (this.state.isRunning) {
      logger.warn("Indexer already running");
      return;
    }
    this.state.isRunning = true;

    const programId = new PublicKey(config.solana.programId);

    this.subscriptionId = this.connection.onLogs(
      programId,
      (logs, ctx) => {
        this.handleLogs(logs, ctx.slot).catch((err) =>
          logger.error("Indexer handleLogs error", { error: err })
        );
      },
      "confirmed"
    );

    logger.info("Indexer started", {
      programId: config.solana.programId,
      subscriptionId: this.subscriptionId,
    });
  }

  /** Stop listening. */
  async stop(): Promise<void> {
    if (this.subscriptionId !== null) {
      await this.connection.removeOnLogsListener(this.subscriptionId);
      this.subscriptionId = null;
    }
    this.state.isRunning = false;
    logger.info("Indexer stopped", {
      processedCount: this.state.processedCount,
    });
  }

  /** Process a batch of transactions between two slots (catch-up). */
  async processBatch(fromSlot: number, toSlot: number): Promise<IndexedEvent[]> {
    const events: IndexedEvent[] = [];
    const programId = new PublicKey(config.solana.programId);

    const signatures = await this.connection.getSignaturesForAddress(
      programId,
      { before: undefined, until: undefined, limit: 100 },
      "confirmed"
    );

    for (const sigInfo of signatures) {
      try {
        const tx = await this.connection.getTransaction(sigInfo.signature, {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        });
        if (!tx || !tx.meta?.logMessages) continue;

        for (const line of tx.meta.logMessages) {
          const event = this.parseEventLog(line, sigInfo.signature, tx.slot);
          if (event) {
            if (tx.blockTime) {
              event.blockTime = new Date(tx.blockTime * 1000);
            }
            events.push(event);
          }
        }
      } catch (err) {
        logger.warn("Failed to process tx in batch", {
          signature: sigInfo.signature,
          error: err,
        });
      }
    }

    this.state.lastProcessedSlot = toSlot;
    this.state.processedCount += events.length;
    return events;
  }

  /* ─── Private ─────────────────────────────────────────── */

  private async handleLogs(
    logs: { err: unknown; logs: string[]; signature: string },
    slot: number
  ): Promise<void> {
    for (const line of logs.logs) {
      const event = this.parseEventLog(line, logs.signature, slot);
      if (!event) continue;

      this.state.lastProcessedSlot = slot;
      this.state.lastProcessedSignature = logs.signature;
      this.state.processedCount++;

      await this.persistEvent(event);
    }
  }

  private parseEventLog(
    line: string,
    signature: string,
    slot: number
  ): IndexedEvent | null {
    if (!line.startsWith(PROGRAM_LOG_PREFIX)) return null;

    const payload = line.slice(PROGRAM_LOG_PREFIX.length).trim();
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(payload);
    } catch {
      return null;
    }

    const action = ACTION_MAP[parsed.action as string];
    if (!action) return null;

    return {
      id: `${signature}:${action}`,
      signature,
      slot,
      blockTime: new Date(),
      action,
      user: String(parsed.user ?? ""),
      market: String(parsed.market ?? ""),
      amount: BigInt(String(parsed.amount ?? "0")),
      amountUsd: Number(parsed.amountUsd ?? 0),
      data: parsed,
    };
  }

  private async persistEvent(event: IndexedEvent): Promise<void> {
    if (!config.database.supabaseUrl) {
      logger.info("Indexed event (no DB)", { id: event.id, action: event.action, user: event.user });
      return;
    }
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        config.database.supabaseUrl,
        config.database.supabaseServiceKey
      );

      const { error } = await supabase.from("events").upsert(
        {
          id: event.id,
          signature: event.signature,
          slot: event.slot,
          block_time: event.blockTime.toISOString(),
          action: event.action,
          user: event.user,
          market: event.market,
          amount: event.amount.toString(),
          amount_usd: event.amountUsd,
          data: event.data,
        },
        { onConflict: "id" }
      );

      if (error) {
        logger.error("Failed to persist event", {
          id: event.id,
          error: error.message,
        });
      }
    } catch (err) {
      logger.error("Database persist error", { error: err });
    }
  }
}

export const indexerService = new IndexerService();
