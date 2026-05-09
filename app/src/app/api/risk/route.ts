import { NextRequest, NextResponse } from "next/server";
import { Keypair } from "@solana/web3.js";
import {
  SOLANA_DEVNET_CAIP2,
  USDC_DEVNET_ADDRESS,
  decodeTransactionFromPayload,
  getTokenPayerFromTransaction,
} from "@x402/svm";
import type { ExactSvmPayloadV1 } from "@x402/svm";
import { getRiskData } from "@/lib/risk-oracle";

let merchantKeypair: Keypair;
try {
  const raw = process.env.X402_MERCHANT_SECRET;
  if (raw) {
    merchantKeypair = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(raw))
    );
  } else {
    merchantKeypair = Keypair.generate();
    console.info(
      "[x402] No X402_MERCHANT_SECRET set — generated ephemeral merchant:",
      merchantKeypair.publicKey.toBase58()
    );
  }
} catch {
  merchantKeypair = Keypair.generate();
}

const MERCHANT_ADDRESS = merchantKeypair.publicKey.toBase58();
const PRICE_ATOMIC = "1000000";
const PRICE_DISPLAY = "1";

function buildPaymentRequired() {
  return {
    x402Version: 1,
    accepts: [
      {
        scheme: "exact",
        network: "solana-devnet",
        payTo: MERCHANT_ADDRESS,
        maxAmountRequired: PRICE_ATOMIC,
        resource: "LiiLend Risk Oracle",
        description:
          "Real-time protocol risk data: vault health, liquidation thresholds, utilization, TVL",
        mimeType: "application/json",
        outputSchema: {},
        asset: USDC_DEVNET_ADDRESS,
        maxTimeoutSeconds: 60,
        extra: {},
      },
    ],
  };
}

function respondPaymentRequired(error?: string) {
  const paymentRequired: Record<string, unknown> = buildPaymentRequired();
  if (error) paymentRequired.error = error;
  return NextResponse.json(
    { error: error ?? "Payment Required" },
    {
      status: 402,
      headers: {
        "PAYMENT-REQUIRED": Buffer.from(
          JSON.stringify(paymentRequired)
        ).toString("base64"),
        "Content-Type": "application/json",
      },
    }
  );
}

async function verifyPayment(paymentSignature: string): Promise<boolean> {
  try {
    let decoded: any;
    try {
      decoded = JSON.parse(
        Buffer.from(paymentSignature, "base64").toString("utf-8")
      );
    } catch {
      return false;
    }

    const version = decoded.x402Version ?? 2;

    if (version === 1) {
      const innerPayload = decoded.payload as ExactSvmPayloadV1;
      if (!innerPayload?.transaction) return false;
      const tx = decodeTransactionFromPayload(innerPayload);
      const payer = getTokenPayerFromTransaction(tx);
      return !!payer;
    }

    if (version === 2) {
      const innerPayload = decoded.payload as ExactSvmPayloadV1;
      if (!innerPayload?.transaction) return false;
      const tx = decodeTransactionFromPayload(innerPayload);
      const payer = getTokenPayerFromTransaction(tx);
      return !!payer;
    }

    return false;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const paymentSignature =
    request.headers.get("PAYMENT-SIGNATURE") ?? undefined;

  if (!paymentSignature) {
    return respondPaymentRequired();
  }

  const valid = await verifyPayment(paymentSignature);
  if (!valid) {
    return respondPaymentRequired("Invalid payment signature");
  }

  try {
    const data = await getRiskData();
    return NextResponse.json({
      success: true,
      payment: {
        network: "solana-devnet",
        asset: USDC_DEVNET_ADDRESS,
        amount: PRICE_DISPLAY,
        merchant: MERCHANT_ADDRESS,
      },
      data,
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message ?? "Failed to fetch risk data" },
      { status: 500 }
    );
  }
}
