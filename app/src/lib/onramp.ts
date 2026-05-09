import type { FiatCurrency } from "@/types";

export interface OnRampConfig {
  apiKey: string;
  environment: "production" | "staging";
}

export interface OnRampParams {
  fiatCurrency: FiatCurrency;
  fiatAmount: number;
  cryptoCurrency: string;
  walletAddress: string;
  redirectUrl?: string;
}

export interface OffRampParams {
  fiatCurrency: FiatCurrency;
  cryptoCurrency: string;
  walletAddress: string;
  redirectUrl?: string;
}

export interface OnRampCallbackData {
  transactionId: string;
  status: "success" | "failed" | "pending";
  walletAddress: string;
  cryptoAmount?: number;
  fiatAmount?: number;
  fiatCurrency?: string;
}

const SUPPORTED_FIAT_CURRENCIES: FiatCurrency[] = ["KES", "NGN", "GHS", "ZAR", "USD"];

const TRANSAK_API_URLS: Record<string, string> = {
  production: "https://api.transak.com",
  staging: "https://api-staging.transak.com",
};

const TRANSAK_WIDGET_URLS: Record<string, string> = {
  production: "https://widget.transak.com",
  staging: "https://staging-widget.transak.com",
};

function getTransakConfig(): OnRampConfig {
  return {
    apiKey: process.env.NEXT_PUBLIC_TRANSAK_API_KEY ?? "",
    environment: (process.env.NEXT_PUBLIC_TRANSAK_ENV as "production" | "staging") ?? "staging",
  };
}

function getStablesConfig(): OnRampConfig {
  return {
    apiKey: process.env.NEXT_PUBLIC_STABLES_API_KEY ?? "",
    environment: (process.env.NEXT_PUBLIC_STABLES_ENV as "production" | "staging") ?? "staging",
  };
}

export function createOnRampUrl(params: OnRampParams): string {
  const config = getTransakConfig();
  const baseUrl = TRANSAK_WIDGET_URLS[config.environment];

  const queryParams = new URLSearchParams({
    apiKey: config.apiKey,
    defaultFiatCurrency: params.fiatCurrency,
    defaultFiatAmount: String(params.fiatAmount),
    defaultCryptoCurrency: params.cryptoCurrency,
    walletAddress: params.walletAddress,
    fiatCurrency: params.fiatCurrency,
    cryptoCurrencyList: params.cryptoCurrency,
    network: "solana",
    redirectURL: params.redirectUrl ?? window.location.origin,
    isDisableCrypto: "true",
    themeColor: "#6366f1",
  });

  return `${baseUrl}?${queryParams.toString()}`;
}

export function createOffRampUrl(params: OffRampParams): string {
  const config = getTransakConfig();
  const baseUrl = TRANSAK_WIDGET_URLS[config.environment];

  const queryParams = new URLSearchParams({
    apiKey: config.apiKey,
    defaultFiatCurrency: params.fiatCurrency,
    defaultCryptoCurrency: params.cryptoCurrency,
    walletAddress: params.walletAddress,
    fiatCurrency: params.fiatCurrency,
    cryptoCurrencyList: params.cryptoCurrency,
    network: "solana",
    redirectURL: params.redirectUrl ?? window.location.origin,
    isDisableCrypto: "true",
    themeColor: "#6366f1",
    isBuyFlow: "false",
  });

  return `${baseUrl}?${queryParams.toString()}`;
}

export function createStablesOnRampUrl(params: OnRampParams): string {
  const config = getStablesConfig();
  const baseUrl = config.environment === "production"
    ? "https://ramp.stables.money"
    : "https://ramp.staging.stables.money";

  const queryParams = new URLSearchParams({
    apiKey: config.apiKey,
    fiatCurrency: params.fiatCurrency,
    fiatAmount: String(params.fiatAmount),
    cryptoCurrency: params.cryptoCurrency,
    walletAddress: params.walletAddress,
    settlementCurrency: params.cryptoCurrency,
    redirectUrl: params.redirectUrl ?? window.location.origin,
  });

  return `${baseUrl}?${queryParams.toString()}`;
}

export async function handleOnRampCallback(
  data: OnRampCallbackData
): Promise<{ success: boolean; txSignature?: string }> {
  if (data.status === "failed") {
    return { success: false };
  }

  if (data.status === "pending") {
    return { success: true };
  }

  return {
    success: true,
    txSignature: data.transactionId,
  };
}

export function isSupportedFiat(currency: string): currency is FiatCurrency {
  return SUPPORTED_FIAT_CURRENCIES.includes(currency as FiatCurrency);
}
