/**
 * Seed vaults with initial liquidity.
 * Deposits all available deployer tokens into their respective vaults.
 *
 * Usage: DEPLOYER_KEYPAIR_PATH=<path> npx tsx scripts/seed-vaults.ts
 */
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
  getOrCreateAssociatedTokenAccount,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Program, AnchorProvider, Wallet, Idl, BN } from "@coral-xyz/anchor";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  PROGRAM_ID,
  RPC_URL,
  CLUSTER,
  SEEDS,
  TOKEN_MINTS,
  CONFIRMATION_TIMEOUT,
} from "./constants";

function loadKeypair(pathStr?: string): Keypair {
  const p = pathStr || process.env.DEPLOYER_KEYPAIR_PATH || path.join(os.homedir(), ".config/solana/id.json");
  return Keypair.fromSecretKey(Buffer.from(JSON.parse(fs.readFileSync(p, "utf-8"))));
}

async function getProgram(connection: Connection, wallet: Wallet): Promise<Program> {
  const idlPath = path.join(__dirname, "..", "target", "idl", "liilend.json");
  const idl: Idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
  return new Program(idl, provider);
}

function findVaultPda(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([SEEDS.VAULT, mint.toBuffer()], PROGRAM_ID);
}

function findUserAccountPda(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([SEEDS.USER, owner.toBuffer()], PROGRAM_ID);
}

function findUserCollateralPda(owner: PublicKey, mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([SEEDS.USER, owner.toBuffer(), mint.toBuffer()], PROGRAM_ID);
}

function findAta(owner: PublicKey, mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )[0];
}

async function getBalance(conn: Connection, owner: PublicKey, mint: PublicKey, decimals: number): Promise<number> {
  const mintStr = mint.toBase58();
  if (mintStr === "So11111111111111111111111111111111111111112") {
    return (await conn.getBalance(owner)) / 10 ** decimals;
  }
  const ata = findAta(owner, mint);
  const info = await conn.getTokenAccountBalance(ata).catch(() => null);
  return info ? Number(info.value.amount) / 10 ** decimals : 0;
}

async function main() {
  console.log(`\n  LiiLend Vault Seeding (${CLUSTER})\n`);

  const connection = new Connection(RPC_URL, "confirmed");
  const authority = loadKeypair();
  const wallet = new Wallet(authority);
  const program = await getProgram(connection, wallet);
  const protocolStatePda = PublicKey.findProgramAddressSync([SEEDS.PROTOCOL], PROGRAM_ID)[0];

  console.log(`  Wallet:       ${authority.publicKey.toBase58()}\n`);

  const assets: { mint: PublicKey; label: string; decimals: number }[] = [
    { mint: TOKEN_MINTS.USDC, label: "USDC", decimals: 6 },
    { mint: TOKEN_MINTS.USDT, label: "USDT", decimals: 6 },
    { mint: TOKEN_MINTS.jitoSOL, label: "jitoSOL", decimals: 9 },
    { mint: TOKEN_MINTS.ETH, label: "ETH", decimals: 8 },
    { mint: TOKEN_MINTS.BTC, label: "BTC", decimals: 8 },
    { mint: TOKEN_MINTS.SOL, label: "SOL", decimals: 9 },
  ];

  for (const asset of assets) {
    const bal = await getBalance(connection, authority.publicKey, asset.mint, asset.decimals);
    if (bal <= 0) {
      console.log(`  [${asset.label}] No balance, skipping`);
      continue;
    }

    const amountBase = Math.floor(bal * 10 ** asset.decimals * 0.95); // deposit 95% of balance
    if (amountBase <= 0) {
      console.log(`  [${asset.label}] Balance too small (${bal}), skipping`);
      continue;
    }

    console.log(`  [${asset.label}] Depositing ${amountBase / 10 ** asset.decimals} ${asset.label}...`);

    const vaultPda = findVaultPda(asset.mint)[0];
    const vaultAta = findAta(vaultPda, asset.mint);
    const userAta = findAta(authority.publicKey, asset.mint);
    const userCollateralPda = findUserCollateralPda(authority.publicKey, asset.mint)[0];
    const userAccountPda = findUserAccountPda(authority.publicKey)[0];

    // Ensure vault ATA
    const vaultAtaInfo = await connection.getAccountInfo(vaultAta);
    if (!vaultAtaInfo) {
      const tx = new Transaction().add(
        createAssociatedTokenAccountIdempotentInstruction(authority.publicKey, vaultAta, vaultPda, asset.mint),
      );
      await sendAndConfirmTransaction(connection, tx, [authority], { skipPreflight: false });
      console.log(`    Created vault ATA`);
    }

    // Ensure user ATA
    const userAtaInfo = await connection.getAccountInfo(userAta);
    if (!userAtaInfo) {
      const tx2 = new Transaction().add(
        createAssociatedTokenAccountIdempotentInstruction(authority.publicKey, userAta, authority.publicKey, asset.mint),
      );
      await sendAndConfirmTransaction(connection, tx2, [authority], { skipPreflight: false });
    }

    const SOL_MINT = "So11111111111111111111111111111111111111112";
    const isSol = asset.mint.toBase58() === SOL_MINT;

    // For SOL, wrap into WSOL before depositing
    if (isSol) {
      const wrapTx = new Transaction().add(
        SystemProgram.transfer({ fromPubkey: authority.publicKey, toPubkey: userAta, lamports: amountBase }),
        createSyncNativeInstruction(userAta),
      );
      await sendAndConfirmTransaction(connection, wrapTx, [authority], { skipPreflight: false });
      console.log(`    Wrapped ${amountBase / 10 ** asset.decimals} SOL → WSOL`);
    }

    const sig = await program.methods
      .depositCollateral(new BN(amountBase))
      .accountsStrict({
        protocolState: protocolStatePda,
        vault: vaultPda,
        userCollateral: userCollateralPda,
        userAccount: userAccountPda,
        vaultAta,
        userAta,
        assetMint: asset.mint,
        authority: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: PublicKey.default,
      } as any)
      .rpc({ skipPreflight: false });

    console.log(`    Deposited → vault. Sig: ${sig.slice(0, 8)}...${sig.slice(-8)}`);
  }

  console.log("\n  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   Vault seeding complete");
  console.log("  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
