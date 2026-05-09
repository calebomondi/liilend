import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  RPC_URL,
  CLUSTER,
  TEST_WALLET_COUNT,
  TEST_WALLET_AIRDROP_AMOUNT,
} from "./constants";
import * as fs from "fs";
import * as path from "path";

const OUTPUT_DIR = path.join(__dirname, "..", "test-wallets");

interface TestWallet {
  index: number;
  publicKey: string;
  secretKey: number[];
  solBalance: number;
}

async function main() {
  console.log(`\n  Setting up ${TEST_WALLET_COUNT} test wallets on ${CLUSTER}\n`);

  const connection = new Connection(RPC_URL, "confirmed");

  // Create output directory
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const wallets: TestWallet[] = [];

  for (let i = 0; i < TEST_WALLET_COUNT; i++) {
    const keypair = Keypair.generate();
    const pubkey = keypair.publicKey.toBase58();

    console.log(`  [${i + 1}/${TEST_WALLET_COUNT}] ${pubkey}`);

    // Airdrop SOL
    let balance = 0;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const sig = await connection.requestAirdrop(
          keypair.publicKey,
          TEST_WALLET_AIRDROP_AMOUNT * LAMPORTS_PER_SOL
        );
        await connection.confirmTransaction(sig, "confirmed");
        balance = await connection.getBalance(keypair.publicKey);
        console.log(`    ✓ Airdropped ${TEST_WALLET_AIRDROP_AMOUNT} SOL (sig: ${sig.slice(0, 16)}...)`);
        break;
      } catch (err: any) {
        console.warn(`    ✗ Attempt ${attempt + 1} failed: ${err.message}`);
        if (attempt < 2) await new Promise((r) => setTimeout(r, 3000));
      }
    }

    wallets.push({
      index: i,
      publicKey: pubkey,
      secretKey: Array.from(keypair.secretKey),
      solBalance: balance / LAMPORTS_PER_SOL,
    });

    // Write individual keypair file
    fs.writeFileSync(
      path.join(OUTPUT_DIR, `wallet-${i}.json`),
      JSON.stringify(Array.from(keypair.secretKey))
    );

    // Rate limit
    if (i < TEST_WALLET_COUNT - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  // Write combined wallet registry
  const registryPath = path.join(OUTPUT_DIR, "wallets.json");
  fs.writeFileSync(registryPath, JSON.stringify(wallets, null, 2));

  // Write pubkeys-only file
  const pubkeysPath = path.join(OUTPUT_DIR, "pubkeys.json");
  fs.writeFileSync(
    pubkeysPath,
    JSON.stringify(wallets.map((w) => w.publicKey), null, 2)
  );

  console.log(`\n  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`   Test Wallets Created`);
  console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`   Directory: ${OUTPUT_DIR}`);
  console.log(`   Registry:  ${registryPath}`);
  console.log(`   Pubkeys:   ${pubkeysPath}`);
  console.log(`   Total:     ${wallets.length} wallets`);
  console.log(`   Each:      ~${TEST_WALLET_AIRDROP_AMOUNT} SOL`);
  console.log(`  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  console.log("  Use airdrop script to fund more:");
  console.log(`    npx ts-node scripts/airdrop-devnet.ts test-wallets/pubkeys.json 2\n`);
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
