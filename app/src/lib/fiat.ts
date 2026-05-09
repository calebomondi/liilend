import type { FiatCurrency } from "@/types";

export interface FiatConfig {
  currency: FiatCurrency;
  symbol: string;
  locale: string;
  decimals: number;
  minAmount: number;
  maxAmount: number;
}

export interface ExchangeRate {
  currency: FiatCurrency;
  rate: number;
  lastUpdated: number;
}

const RATE_CACHE: Map<FiatCurrency, ExchangeRate> = new Map();
const CACHE_TTL_MS = 60_000;

export const SUPPORTED_FIATS: FiatConfig[] = [
  {
    currency: "KES",
    symbol: "KSh",
    locale: "sw-KE",
    decimals: 2,
    minAmount: 100,
    maxAmount: 1_000_000,
  },
  {
    currency: "NGN",
    symbol: "₦",
    locale: "en-NG",
    decimals: 2,
    minAmount: 500,
    maxAmount: 5_000_000,
  },
  {
    currency: "GHS",
    symbol: "GH₵",
    locale: "en-GH",
    decimals: 2,
    minAmount: 50,
    maxAmount: 500_000,
  },
  {
    currency: "ZAR",
    symbol: "R",
    locale: "en-ZA",
    decimals: 2,
    minAmount: 50,
    maxAmount: 500_000,
  },
  {
    currency: "USD",
    symbol: "$",
    locale: "en-US",
    decimals: 2,
    minAmount: 10,
    maxAmount: 100_000,
  },
];

const FIAT_MAP = Object.fromEntries(
  SUPPORTED_FIATS.map((f) => [f.currency, f])
) as Record<FiatCurrency, FiatConfig>;

function getFiatConfig(currency: FiatCurrency): FiatConfig {
  const config = FIAT_MAP[currency];
  if (!config) throw new Error(`Unsupported fiat currency: ${currency}`);
  return config;
}

function getCachedRate(currency: FiatCurrency): ExchangeRate | undefined {
  const cached = RATE_CACHE.get(currency);
  if (cached && Date.now() - cached.lastUpdated < CACHE_TTL_MS) {
    return cached;
  }
  return undefined;
}

async function fetchRateFromApi(currency: FiatCurrency): Promise<ExchangeRate> {
  const baseCurrency = "USD";
  const apiKey = process.env.NEXT_PUBLIC_EXCHANGE_RATE_API_KEY;

  let url: string;
  if (apiKey) {
    url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${baseCurrency}`;
  } else {
    url = `https://open.er-api.com/v6/latest/${baseCurrency}`;
  }

  const response = await fetch(url, { next: { revalidate: 60 } });

  if (!response.ok) {
    throw new Error(`Exchange rate fetch failed: ${response.status}`);
  }

  const data = await response.json();
  const rate = data.rates[currency];

  if (!rate) {
    throw new Error(`Rate unavailable for ${currency}`);
  }

  const exchangeRate: ExchangeRate = {
    currency,
    rate,
    lastUpdated: Date.now(),
  };

  RATE_CACHE.set(currency, exchangeRate);
  return exchangeRate;
}

export async function getExchangeRates(
  currencies?: FiatCurrency[]
): Promise<ExchangeRate[]> {
  const targets = currencies ?? (SUPPORTED_FIATS.map((f) => f.currency) as FiatCurrency[]);
  const results: ExchangeRate[] = [];

  for (const currency of targets) {
    const cached = getCachedRate(currency);
    if (cached) {
      results.push(cached);
    } else {
      const rate = await fetchRateFromApi(currency);
      results.push(rate);
    }
  }

  return results;
}

export async function convertFiatToUsdc(
  fiatAmount: number,
  fiatCurrency: FiatCurrency
): Promise<{ usdcAmount: number; rate: number }> {
  let rate = getCachedRate(fiatCurrency);
  if (!rate) {
    rate = await fetchRateFromApi(fiatCurrency);
  }

  const usdcAmount = fiatAmount / rate.rate;
  return { usdcAmount, rate: rate.rate };
}

export async function convertUsdcToFiat(
  usdcAmount: number,
  fiatCurrency: FiatCurrency
): Promise<{ fiatAmount: number; rate: number }> {
  let rate = getCachedRate(fiatCurrency);
  if (!rate) {
    rate = await fetchRateFromApi(fiatCurrency);
  }

  const fiatAmount = usdcAmount * rate.rate;
  return { fiatAmount, rate: rate.rate };
}

export function formatFiatAmount(
  amount: number,
  currency: FiatCurrency
): string {
  const config = getFiatConfig(currency);
  try {
    return new Intl.NumberFormat(config.locale, {
      style: "currency",
      currency,
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals,
    }).format(amount);
  } catch {
    return `${config.symbol}${amount.toFixed(config.decimals)}`;
  }
}
