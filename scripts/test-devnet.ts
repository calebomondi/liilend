import {
  Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { SystemProgram } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet, BN } from "@coral-xyz/anchor";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

import {
  PROGRAM_ID, RPC_URL, CLUSTER,
} from "./constants";

const BORROW_SEED = Buffer.from("liilend-borrow");

function loadKeypair(pathStr?: string): Keypair {
  const p = pathStr || process.env.DEPLOYER_KEYPAIR_PATH || path.join(os.homedir(), ".config/solana/id.json");
  return Keypair.fromSecretKey(Buffer.from(JSON.parse(fs.readFileSync(p, "utf-8"))));
}

function findProtocolStatePda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("liilend-protocol")], PROGRAM_ID
  );
}

function findVaultPda(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("liilend-vault"), mint.toBuffer()], PROGRAM_ID
  );
}

function findUserAccountPda(authority: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("liilend-user"), authority.toBuffer()], PROGRAM_ID
  );
}

function findUserCollateralPda(authority: PublicKey, mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("liilend-user"), authority.toBuffer(), mint.toBuffer()], PROGRAM_ID
  );
}

function findBorrowPositionPda(authority: PublicKey, mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [BORROW_SEED, authority.toBuffer(), mint.toBuffer()], PROGRAM_ID
  );
}

async function ensureAta(conn: Connection, payer: Keypair, owner: PublicKey, mint: PublicKey): Promise<PublicKey> {
  const ata = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )[0];
  const acc = await conn.getAccountInfo(ata);
  if (acc) return ata;
  const tx = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(payer.publicKey, ata, owner, mint)
  );
  await sendAndConfirmTransaction(conn, tx, [payer], { skipPreflight: false });
  return ata;
}

async function main() {
  console.log(`\n  LiiLend Devnet Integration Test (${CLUSTER})\n`);

  const conn = new Connection(RPC_URL, "confirmed");
  const authority = loadKeypair();
  const wallet = new Wallet(authority);
  const provider = new AnchorProvider(conn, wallet, { commitment: "confirmed" });

  const idlPath = path.join(__dirname, "..", "target", "idl", "liilend.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const program = new Program(idl, provider);

  const [protocolStatePda] = findProtocolStatePda();
  const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
  const USDC_MINT = new PublicKey("F88tFzVdURKCKzLWqGAu9omz5GsHAURbGcrrL4EK8CKZ");
  const [solVaultPda] = findVaultPda(SOL_MINT);
  const [usdcVaultPda] = findVaultPda(USDC_MINT);

  console.log(`  Wallet:       ${authority.publicKey.toBase58()}`);
  console.log(`  Program ID:   ${PROGRAM_ID.toBase58()}`);
  console.log(`  ProtocolState: ${protocolStatePda.toBase58()}`);
  console.log(`  SOL Vault:    ${solVaultPda.toBase58()}`);
  console.log(`  USDC Vault:   ${usdcVaultPda.toBase58()}\n`);

  // ── 0. Create vault ATAs if needed ──────────────────────────────────────
  console.log("  [0/6] Ensuring vault ATAs exist...");
  const solVaultAta = await ensureAta(conn, authority, solVaultPda, SOL_MINT);
  console.log(`  SOL vault ATA: ${solVaultAta.toBase58()}`);
  const usdcVaultAta = await ensureAta(conn, authority, usdcVaultPda, USDC_MINT);
  console.log(`  USDC vault ATA: ${usdcVaultAta.toBase58()}`);

  // ── 1. Deposit SOL ───────────────────────────────────────────────────────
  const depositAmountLamports = 100_000_000; // 0.1 SOL
  const depositAmount = new BN(depositAmountLamports);
  console.log(`\n  [1/5] Depositing ${depositAmount.toString()} SOL...`);

  const userCollateralPda = findUserCollateralPda(authority.publicKey, SOL_MINT)[0];
  const userAccountPda = findUserAccountPda(authority.publicKey)[0];
  const userSolAta = await ensureAta(conn, authority, authority.publicKey, SOL_MINT);

  // Wrap SOL (wSOL for deposit)
  const solAtaInfo = await conn.getTokenAccountBalance(userSolAta);
  const solBalance = Number(solAtaInfo.value.amount);
  const wrapNeeded = depositAmountLamports * 2 - solBalance; // need for deposit + fees
  if (wrapNeeded > 0) {
    const wrapAmount = BigInt(wrapNeeded) + 5_000_000n; // add buffer
    console.log(`  Wrapping ${wrapAmount.toString()} lamports SOL...`);
    const wrapTx = new Transaction().add(
      SystemProgram.transfer({ fromPubkey: authority.publicKey, toPubkey: userSolAta, lamports: wrapAmount }),
      createSyncNativeInstruction(userSolAta),
    );
    await sendAndConfirmTransaction(conn, wrapTx, [authority], { skipPreflight: false });
  }

  const depositSig = await program.methods
    .depositCollateral(depositAmount)
    .accountsStrict({
      protocolState: protocolStatePda,
      vault: solVaultPda,
      userCollateral: userCollateralPda,
      userAccount: userAccountPda,
      vaultAta: solVaultAta,
      userAta: userSolAta,
      assetMint: SOL_MINT,
      authority: authority.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: PublicKey.default,
    } as any)
    .rpc({ skipPreflight: false });
  console.log(`  Deposit signature: ${depositSig}`);

  // Check deposit
  const userAccAfter = await (program.account as any).userAccount.fetch(userAccountPda);
  console.log(`  Collateral shares: ${userAccAfter.collateralShares.toString()}`);

  // ── 2. Seed USDC vault (deposit USDC for liquidity) ──────────────────────
  const seedUsdcAmount = new BN(10_000_000); // 10 USDC
  console.log(`\n  [2/5] Depositing ${seedUsdcAmount.toString()} USDC as vault seed...`);

  const borrowPositionPda = findBorrowPositionPda(authority.publicKey, USDC_MINT)[0];
  const userCollateralUsdcPda = findUserCollateralPda(authority.publicKey, USDC_MINT)[0];
  const userUsdcAta = await ensureAta(conn, authority, authority.publicKey, USDC_MINT);

  const seedDepositSig = await program.methods
    .depositCollateral(seedUsdcAmount)
    .accountsStrict({
      protocolState: protocolStatePda,
      vault: usdcVaultPda,
      userCollateral: userCollateralUsdcPda,
      userAccount: userAccountPda,
      vaultAta: usdcVaultAta,
      userAta: userUsdcAta,
      assetMint: USDC_MINT,
      authority: authority.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: PublicKey.default,
    } as any)
    .rpc({ skipPreflight: false });
  console.log(`  Seed deposit signature: ${seedDepositSig}`);

  // ── 3. Borrow USDC ───────────────────────────────────────────────────────
  const borrowAmount = new BN(1_000_000); // 1 USDC
  console.log(`\n  [3/5] Borrowing ${borrowAmount.toString()} USDC...`);

  const borrowSig = await program.methods
    .borrowAsset(borrowAmount)
    .accountsStrict({
      protocolState: protocolStatePda,
      vault: usdcVaultPda,
      userAccount: userAccountPda,
      borrowPosition: borrowPositionPda,
      vaultAta: usdcVaultAta,
      userAta: userUsdcAta,
      borrowMint: USDC_MINT,
      collateralPriceFeed: PublicKey.default,
      borrowPriceFeed: PublicKey.default,
      authority: authority.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: PublicKey.default,
    } as any)
    .rpc({ skipPreflight: false });
  console.log(`  Borrow signature: ${borrowSig}`);

  // ── 4. Repay USDC ────────────────────────────────────────────────────────
  const repayAmount = new BN(1_000_000); // 1 USDC
  console.log(`\n  [4/5] Repaying ${repayAmount.toString()} USDC...`);

  const repaySig = await program.methods
    .repayDebt(repayAmount)
    .accountsStrict({
      protocolState: protocolStatePda,
      vault: usdcVaultPda,
      borrowPosition: borrowPositionPda,
      userAccount: userAccountPda,
      vaultAta: usdcVaultAta,
      userAta: userUsdcAta,
      repayMint: USDC_MINT,
      authority: authority.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: PublicKey.default,
    } as any)
    .rpc({ skipPreflight: false });
  console.log(`  Repay signature: ${repaySig}`);

  // ── 5. Withdraw SOL ──────────────────────────────────────────────────────
  const userCollateral = await (program.account as any).userCollateralAccount.fetch(userCollateralPda);
  const withdrawShares = userCollateral.shares;
  console.log(`\n  [5/5] Withdrawing all SOL (${withdrawShares.toString()} shares)...`);

  const withdrawSig = await program.methods
    .withdrawCollateral(withdrawShares)
    .accountsStrict({
      protocolState: protocolStatePda,
      vault: solVaultPda,
      userCollateral: userCollateralPda,
      userAccount: userAccountPda,
      vaultAta: solVaultAta,
      userAta: userSolAta,
      assetMint: SOL_MINT,
      authority: authority.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: PublicKey.default,
    } as any)
    .rpc({ skipPreflight: false });
  console.log(`  Withdraw signature: ${withdrawSig}`);

  // ── 6. Summary ─────────────────────────────────────────────────────────
  console.log("\n  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   All operations completed successfully!");
  console.log("  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main().catch((err) => {
  console.error("\n  Test failed:", err);
  process.exit(1);
});
