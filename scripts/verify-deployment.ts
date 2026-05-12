import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { Program, AnchorProvider, Wallet, Idl } from "@coral-xyz/anchor";
import * as fs from "fs";
import * as path from "path";
import {
  PROGRAM_ID,
  RPC_URL,
  CLUSTER,
  SEEDS,
  ASSET_CONFIGS,
} from "./constants";

// ── PDA helpers ───────────────────────────────────────────────────────────────
function findProtocolStatePda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([SEEDS.PROTOCOL], PROGRAM_ID);
}

function findTreasuryPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([SEEDS.TREASURY], PROGRAM_ID);
}

function findVaultPda(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.VAULT, mint.toBuffer()],
    PROGRAM_ID
  );
}

function findPriceFeedPda(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.PRICE_FEED, mint.toBuffer()],
    PROGRAM_ID
  );
}

// ── Formatting ────────────────────────────────────────────────────────────────
function fmt(value: number | bigint | undefined, decimals: number): string {
  if (value === undefined) return "N/A";
  const num = Number(value) / 10 ** decimals;
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  });
}

function fmtPercent(bps: number): string {
  return (bps / 100).toFixed(2) + "%";
}

// ── Checks ────────────────────────────────────────────────────────────────────
type CheckResult = { label: string; status: "ok" | "fail" | "warn"; detail: string };

async function checkProgramDeployment(
  connection: Connection
): Promise<CheckResult> {
  try {
    const accountInfo = await connection.getAccountInfo(PROGRAM_ID);
    if (accountInfo && accountInfo.executable) {
      return {
        label: "Program deployed",
        status: "ok",
        detail: `${PROGRAM_ID.toBase58()} (${accountInfo.data.length} bytes)`,
      };
    }
    return {
      label: "Program deployed",
      status: "fail",
      detail: "Not found or not executable",
    };
  } catch (err: any) {
    return { label: "Program deployed", status: "fail", detail: err.message };
  }
}

async function checkAccount(
  connection: Connection,
  label: string,
  pda: PublicKey,
  expectedSize?: number
): Promise<CheckResult> {
  try {
    const info = await connection.getAccountInfo(pda);
    if (!info) {
      return { label, status: "fail", detail: "Account does not exist" };
    }
    const sizeOk = expectedSize ? info.data.length === expectedSize : true;
    if (!sizeOk) {
      return {
        label,
        status: "warn",
        detail: `Exists (${info.data.length} bytes, expected ${expectedSize})`,
      };
    }
    return {
      label,
      status: "ok",
      detail: `Exists (${info.data.length} bytes, owner: ${info.owner.toBase58().slice(0, 12)}...)`,
    };
  } catch (err: any) {
    return { label, status: "fail", detail: err.message };
  }
}

async function checkProtocolState(
  program: Program,
  connection: Connection
): Promise<CheckResult[]> {
  const [pda] = findProtocolStatePda();
  const info = await connection.getAccountInfo(pda);
  if (!info) {
    return [
      {
        label: "ProtocolState data",
        status: "fail",
        detail: "Account not found",
      },
    ];
  }

  try {
    const state: any = await program.account.protocolState.fetch(pda);
    return [
      {
        label: "ProtocolState authority",
        status: "ok",
        detail: state.authority.toBase58(),
      },
      {
        label: "ProtocolState treasury",
        status: "ok",
        detail: state.treasury.toBase58(),
      },
      {
        label: "ProtocolState paused",
        status: state.paused ? "warn" : "ok",
        detail: String(state.paused),
      },
      {
        label: "ProtocolState asset_count",
        status: "ok",
        detail: String(state.assetCount),
      },
    ];
  } catch (err: any) {
    return [
      {
        label: "ProtocolState data",
        status: "fail",
        detail: `Deserialization error: ${err.message}`,
      },
    ];
  }
}

async function checkTreasury(
  program: Program,
  connection: Connection
): Promise<CheckResult[]> {
  const [pda] = findTreasuryPda();
  const info = await connection.getAccountInfo(pda);
  if (!info) {
    return [
      { label: "Treasury data", status: "fail", detail: "Account not found" },
    ];
  }

  try {
    const treasury: any = await program.account.treasuryAccount.fetch(pda);
    return [
      {
        label: "Treasury fee_accumulator",
        status: "ok",
        detail: String(treasury.feeAccumulator),
      },
      {
        label: "Treasury insurance_fund",
        status: "ok",
        detail: String(treasury.insuranceFund),
      },
    ];
  } catch (err: any) {
    return [
      {
        label: "Treasury data",
        status: "fail",
        detail: `Deserialization error: ${err.message}`,
      },
    ];
  }
}

async function checkAssetConfigs(
  program: Program,
  connection: Connection
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  for (let i = 0; i < ASSET_CONFIGS.length; i++) {
    const cfg = ASSET_CONFIGS[i];
    const [vaultPda] = findVaultPda(cfg.mint);

    const vaultInfo = await connection.getAccountInfo(vaultPda);
    if (!vaultInfo) {
      results.push({
        label: `Asset[${i}] vault (${cfg.mint.toBase58().slice(0, 8)}...)`,
        status: "fail",
        detail: "Vault not initialized",
      });
      continue;
    }

    try {
      const vault: any = await program.account.vaultAccount.fetch(vaultPda);
      results.push({
        label: `Asset[${i}] vault (${cfg.mint.toBase58().slice(0, 8)}...)`,
        status: "ok",
        detail: `Shares: ${fmt(vault.totalShares, 9)}, Value: ${fmt(vault.totalValue, cfg.decimals)}`,
      });
    } catch (err: any) {
      results.push({
        label: `Asset[${i}] vault (${cfg.mint.toBase58().slice(0, 8)}...)`,
        status: "fail",
        detail: `Deserialization error: ${err.message}`,
      });
    }

    // Check price feed
    const [priceFeedPda] = findPriceFeedPda(cfg.mint);
    const pfInfo = await connection.getAccountInfo(priceFeedPda);
    if (!pfInfo) {
      results.push({
        label: `Asset[${i}] price feed`,
        status: "fail",
        detail: "Price feed not initialized",
      });
    } else {
      results.push({
        label: `Asset[${i}] price feed`,
        status: "ok",
        detail: `Exists (${pfInfo.data.length} bytes)`,
      });
    }
  }

  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n  LiiLend Deployment Verification (${CLUSTER})\n`);

  const connection = new Connection(RPC_URL, "confirmed");

  // Load IDL for deserialization
  const idlPath = path.join(__dirname, "..", "target", "idl", "liilend.json");
  if (!fs.existsSync(idlPath)) {
    console.error(`  IDL not found at ${idlPath}. Build first with "anchor build".`);
    process.exit(1);
  }
  const idl: Idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));

  // Dummy wallet for read-only queries
  const dummyWallet = new Wallet(Keypair.generate());
  const provider = new AnchorProvider(connection, dummyWallet, {
    commitment: "confirmed",
  });
  const program = new Program(idl, provider);

  // ── Run all checks ──────────────────────────────────────────────────────────
  const allChecks: CheckResult[] = [];

  allChecks.push(await checkProgramDeployment(connection));

  const [protocolPda] = findProtocolStatePda();
  const [treasuryPda] = findTreasuryPda();

  allChecks.push(
    await checkAccount(connection, "ProtocolState PDA", protocolPda)
  );
  allChecks.push(
    await checkAccount(connection, "Treasury PDA", treasuryPda)
  );
  allChecks.push(...(await checkProtocolState(program, connection)));
  allChecks.push(...(await checkTreasury(program, connection)));
  allChecks.push(...(await checkAssetConfigs(program, connection)));

  // ── Render results ──────────────────────────────────────────────────────────
  let passed = 0;
  let failed = 0;
  let warned = 0;

  console.log("  ────────────────────────────────────────────────");
  for (const check of allChecks) {
    const icon =
      check.status === "ok"
        ? "✓"
        : check.status === "fail"
          ? "✗"
          : "⚠";
    const color =
      check.status === "ok"
        ? "\x1b[32m"
        : check.status === "fail"
          ? "\x1b[31m"
          : "\x1b[33m";
    console.log(`  ${color}${icon}${"\x1b[0m"} ${check.label}`);
    console.log(`     ${check.detail}`);

    if (check.status === "ok") passed++;
    else if (check.status === "fail") failed++;
    else warned++;
  }
  console.log("  ────────────────────────────────────────────────");

  console.log(`\n  Results: ${passed} passed, ${failed} failed, ${warned} warnings\n`);

  if (failed > 0) {
    console.log("  Some checks failed. Review the details above.\n");
    process.exit(1);
  }

  console.log("  All checks passed.\n");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
