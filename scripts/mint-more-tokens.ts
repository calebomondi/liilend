/**
 * Mint additional mock tokens to the deployer to reach $1M per asset.
 * The deployer is the mint authority for all mock tokens.
 *
 * Usage: DEPLOYER_KEYPAIR_PATH=<path> npx tsx scripts/mint-more-tokens.ts
 */
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { createMintToInstruction, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { RPC_URL, TOKEN_MINTS } from "./constants";

function loadKeypair(): Keypair {
  const p = process.env.DEPLOYER_KEYPAIR_PATH || path.join(os.homedir(), ".config/solana/id.json");
  return Keypair.fromSecretKey(Buffer.from(JSON.parse(fs.readFileSync(p, "utf-8"))));
}

const conn = new Connection(RPC_URL, "confirmed");
const deployer = loadKeypair();

const TARGET_SUPPLY: Record<string, { mint: PublicKey; decimals: number; targetUnits: number }> = {
  USDC: { mint: TOKEN_MINTS.USDC, decimals: 6, targetUnits: 1_000_000 },
  USDT: { mint: TOKEN_MINTS.USDT, decimals: 6, targetUnits: 1_000_000 },
  ETH: { mint: TOKEN_MINTS.ETH, decimals: 8, targetUnits: 300 },
  jitoSOL: { mint: TOKEN_MINTS.jitoSOL, decimals: 9, targetUnits: 70_000 },
  BTC: { mint: TOKEN_MINTS.BTC, decimals: 8, targetUnits: 10 },
};

async function main() {
  console.log(`\n  Minting additional mock tokens to ${deployer.publicKey.toBase58()}\n`);

  for (const [sym, cfg] of Object.entries(TARGET_SUPPLY)) {
    const ata = await getOrCreateAssociatedTokenAccount(conn, deployer, cfg.mint, deployer.publicKey);
    const currentBal = Number(ata.amount);
    const currentBalUnits = currentBal / 10 ** cfg.decimals;
    const targetUnitsRaw = cfg.targetUnits;
    const needed = BigInt(Math.floor(targetUnitsRaw * 10 ** cfg.decimals)) - ata.amount;

    if (needed <= 0n) {
      console.log(`  [${sym}] Already ${currentBalUnits.toLocaleString()} ${sym} (target ${targetUnitsRaw.toLocaleString()}), skipping`);
      continue;
    }

    const mintAmtUnits = Number(needed) / 10 ** cfg.decimals;
    console.log(`  [${sym}] Minting ${mintAmtUnits.toLocaleString()} ${sym} to deployer...`);

    const tx = new Transaction().add(
      createMintToInstruction(cfg.mint, ata.address, deployer.publicKey, needed),
    );
    const sig = await conn.sendTransaction(tx, [deployer], { skipPreflight: false });
    await conn.confirmTransaction(sig, "confirmed");
    console.log(`    Done. Sig: ${sig.slice(0, 8)}...${sig.slice(-8)}`);

    const newAta = await conn.getTokenAccountBalance(ata.address);
    const newBalUnits = Number(newAta.value.amount) / 10 ** cfg.decimals;
    console.log(`    Balance now: ${newBalUnits.toLocaleString()} ${sym}`);
  }

  console.log(`\n  ───── Minting complete ─────\n`);
}

main().catch((err) => {
  console.error("Minting failed:", err);
  process.exit(1);
});
