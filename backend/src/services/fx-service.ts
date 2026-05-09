import axios from "axios";
import { config } from "../config";
import { logger } from "../config/logger";
import {
  FiatCurrency,
  FxRate,
  FxCacheEntry,
  ConversionRequest,
  ConversionResult,
} from "../types";

const SUPPORTED_CURRENCIES: FiatCurrency[] = ["KES", "NGN", "GHS", "ZAR", "USD"];
const USD_INDEX = 4;

export class FxService {
  private cache: Map<string, FxCacheEntry> = new Map();
  private oracleUrl: string;
  private fallbackUrls: string[];
  private ttlMs: number;

  constructor() {
    this.oracleUrl = config.fx.oracleUrl;
    this.fallbackUrls = config.fx.fallbackUrls;
    this.ttlMs = config.fx.cacheTtlSeconds * 1000;
  }

  /* ─── Public API ──────────────────────────────────────── */

  async getRates(): Promise<FxRate[]> {
    const cached = this.fromCache();
    if (cached) return cached;

    try {
      return await this.fetchFromOracle();
    } catch (err) {
      logger.warn("Oracle fetch failed, trying fallback", { error: err });
    }

    try {
      return await this.fetchFromFallback();
    } catch (err) {
      logger.error("All FX sources failed", { error: err });
      const stale = this.fromCache(true);
      if (stale) {
        logger.info("Returning stale FX cache");
        return stale;
      }
      throw new Error("All FX rate sources unavailable");
    }
  }

  async convert(req: ConversionRequest): Promise<ConversionResult> {
    const rates = await this.getRates();

    const rateMap: Record<string, number> = {};
    for (const r of rates) rateMap[r.currency] = r.rateToUsd;

    const fromRate = rateMap[req.from];
    const toRate = rateMap[req.to];

    if (!fromRate) throw new Error(`Unsupported currency: ${req.from}`);
    if (!toRate) throw new Error(`Unsupported currency: ${req.to}`);

    const usdAmount = req.amount * fromRate;
    const outputAmount = usdAmount / toRate;
    const crossRate = fromRate / toRate;

    return {
      from: req.from,
      to: req.to,
      inputAmount: req.amount,
      outputAmount,
      rate: crossRate,
      timestamp: new Date(),
    };
  }

  /* ─── Oracle Fetch ────────────────────────────────────── */

  private async fetchFromOracle(): Promise<FxRate[]> {
    const resp = await axios.get<{ results: Record<string, { price: number }> }>(
      `${this.oracleUrl}/prices`,
      { params: { pairs: SUPPORTED_CURRENCIES.join(",") }, timeout: 10_000 }
    );

    const now = Date.now();
    const rates: FxRate[] = SUPPORTED_CURRENCIES.map((currency) => ({
      currency,
      rateToUsd: currency === "USD" ? 1 : resp.data.results[currency]?.price ?? 0,
      timestamp: new Date(now),
      source: "oracle",
    }));

    this.writeCache(rates);
    return rates;
  }

  /* ─── Fallback Fetch ──────────────────────────────────── */

  private async fetchFromFallback(): Promise<FxRate[]> {
    for (const url of this.fallbackUrls) {
      try {
        const resp = await axios.get<Record<string, number>>(url, { timeout: 8_000 });
        const data = resp.data;
        const now = Date.now();

        const rates: FxRate[] = SUPPORTED_CURRENCIES.map((currency) => {
          if (currency === "USD") {
            return { currency, rateToUsd: 1, timestamp: new Date(now), source: "fallback" };
          }
          const key = currency.toLowerCase();
          const rate = (data as any).rates?.[key] ?? (data as any)[key];
          return {
            currency,
            rateToUsd: rate ? 1 / rate : 0,
            timestamp: new Date(now),
            source: "fallback",
          };
        });

        this.writeCache(rates);
        return rates;
      } catch {
        continue;
      }
    }
    throw new Error("All fallback URLs exhausted");
  }

  /* ─── Cache ───────────────────────────────────────────── */

  private cacheKey(): string {
    return SUPPORTED_CURRENCIES.sort().join(":");
  }

  private writeCache(rates: FxRate[]): void {
    const record: Record<FiatCurrency, number> = {} as Record<FiatCurrency, number>;
    for (const r of rates) record[r.currency] = r.rateToUsd;

    this.cache.set(this.cacheKey(), {
      rates: record,
      timestamp: Date.now(),
    });
  }

  private fromCache(allowStale = false): FxRate[] | null {
    const entry = this.cache.get(this.cacheKey());
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (!allowStale && age > this.ttlMs) {
      this.cache.delete(this.cacheKey());
      return null;
    }

    return SUPPORTED_CURRENCIES.map((currency) => ({
      currency,
      rateToUsd: entry.rates[currency],
      timestamp: new Date(entry.timestamp),
      source: "cache" as const,
    }));
  }
}

export const fxService = new FxService();
