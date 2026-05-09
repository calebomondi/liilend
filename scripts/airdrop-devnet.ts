import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  RPC_URL,
  CLUSTER,
  SOL_AIRDROP_AMOUNT,
  TEST_WALLET_AIRDROP_AMOUNT,
  TEST_WALLET_COUNT,
} from "./constants";
import * as fs from "fs";
import * as path from "path";

// ── CLI ───────────────────────────────────────────────────────────────────────
const USAGE = `
Usage:
  npx ts-node scripts/airdrop-devnet.ts <address|wallet-file> [amount]

Examples:
  npx ts-node scripts/airdrop-devnet.ts <PUBKEY>
  npx ts-node scripts/airdrop-devnet.ts test-wallets.json
  npx ts-node scripts/airdrop-devnet.ts <PUBKEY> 10
`;

async function main() {
  const connection = new Connection(RPC_URL, "confirmed");

  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log(USAGE);
    process.exit(0);
  }

  const targetArg = args[0];
  const amountArg = args[1];

  // Collect addresses to airdrop to
  let addresses: PublicKey[];
  let amount: number;

  // Determine amount
  if (amountArg) {
    amount = parseInt(amountArg, 10);
    if (isNaN(amount) || amount <= 0) {
      console.error("Invalid amount. Must be a positive integer.");
      process.exit(1);
    }
  } else {
    amount = TEST_WALLET_AIRDROP_AMOUNT;
  }

  // Determine target(s)
  if (fs.existsSync(targetArg)) {
    // File-based: JSON array of pubkeys or keypair objects
    const raw = JSON.parse(fs.readFileSync(targetArg, "utf-8"));
    if (Array.isArray(raw)) {
      addresses = raw.map((entry: any) => {
        if (typeof entry === "string") return new PublicKey(entry);
        if (entry.publicKey) return new PublicKey(entry.publicKey);
        throw new Error(
          `Unrecognized entry in wallet file: ${JSON.stringify(entry)}`
        );
      });
    } else {
      throw new Error("Wallet file must contain a JSON array.");
    }
  } else {
    // Single address
    addresses = [new PublicKey(targetArg)];
  }

  console.log(`\n  Airdropping to ${CLUSTER} (${RPC_URL})\n`);
  console.log(`  Recipients: ${addresses.length}`);
  console.log(`  Amount:     ${amount} SOL each`);
  console.log(`  Total:      ${amount * addresses.length} SOL\n`);

  for (let i = 0; i < addresses.length; i++) {
    const addr = addresses[i];
    const balanceBefore = await connection.getBalance(addr);

    console.log(
      `  [${i + 1}/${addresses.length}] ${addr.toBase58()} (bal: ${(balanceBefore / LAMPORTS_PER_SOL).toFixed(3)} SOL)`
    );

    // Devnet airdrops are limited; try multiple times if needed
    let success = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const sig = await connection.requestAirdrop(
          addr,
          amount * LAMPORTS_PER_SOL
        );
        await connection.confirmTransaction(sig, "confirmed");
        success = true;
        const balanceAfter = await connection.getBalance(addr);
        console.log(`    ✓ Airdropped. New balance: ${(balanceAfter / LAMPORTS_PER_SOL).toFixed(3)} SOL`);
        console.log(`    Signature: ${sig}`);
        break;
      } catch (err: any) {
        console.warn(`    ✗ Attempt ${attempt + 1} failed: ${err.message}`);
        if (attempt < 2) await new Promise((r) => setTimeout(r, 3000));
      }
    }

    if (!success) {
      console.error(`    ✗ Failed to airdrop to ${addr.toBase58()} after 3 attempts.`);
    }

    // Rate limit between airdrops
    if (i < addresses.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log("\n  Airdrop complete.\n");
}

main().catch((err) => {
  console.error("Airdrop failed:", err);
  process.exit(1);
});
