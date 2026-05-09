import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import { Program, IdlAccounts, BN } from "@coral-xyz/anchor";
import type { Liilend } from "../../../target/types/liilend";

export const PROGRAM_ID = new PublicKey(
  "LiiLryA3sZtz3Qeuo3YjZE5tdq4zK6zHMPpwfHNqB8v"
);

export type ProtocolStateAccount = IdlAccounts<Liilend>["protocolState"];
export type UserAccount = IdlAccounts<Liilend>["userAccount"];
export type VaultAccount = IdlAccounts<Liilend>["vaultAccount"];
export type PriceFeedAccount = IdlAccounts<Liilend>["priceFeed"];
export type BorrowPositionAccount = IdlAccounts<Liilend>["borrowPosition"];
export type UserCollateralAccount = IdlAccounts<Liilend>["userCollateralAccount"];
export type TreasuryAccount = IdlAccounts<Liilend>["treasuryAccount"];

function getConnection(): Connection {
  return new Connection(
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com"
  );
}

function getProgramIdl(): Liilend {
  return {
    address: PROGRAM_ID.toBase58(),
    metadata: {
      name: "liilend",
      version: "0.1.0",
      spec: "0.1.0",
      description: "LiiLend - Crypto-collateralized borrowing for emerging markets",
    },
    instructions: [],
    accounts: [],
    events: [],
    errors: [],
    types: [],
  } as unknown as Liilend;
}

export async function getProtocolState(
  program: Program<Liilend>
): Promise<ProtocolStateAccount> {
  const [pda] = deriveProtocolStatePDA();
  return program.account.protocolState.fetch(pda);
}

export async function getUserAccount(
  program: Program<Liilend>,
  owner: PublicKey
): Promise<UserAccount | null> {
  const [pda] = deriveUserAccountPDA(owner);
  try {
    return await program.account.userAccount.fetch(pda);
  } catch {
    return null;
  }
}

export async function getVaultAccount(
  program: Program<Liilend>,
  assetMint: PublicKey
): Promise<VaultAccount | null> {
  const [pda] = deriveVaultPDA(assetMint);
  try {
    return await (program.account as any).vaultAccount.fetch(pda) as VaultAccount;
  } catch {
    return null;
  }
}

export async function getPriceFeed(
  program: Program<Liilend>,
  assetMint: PublicKey
): Promise<PriceFeedAccount | null> {
  const [pda] = derivePriceFeedPDA(assetMint);
  try {
    return await program.account.priceFeed.fetch(pda);
  } catch {
    return null;
  }
}

export function deriveProtocolStatePDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("liilend-protocol")],
    PROGRAM_ID
  );
}

export function deriveUserAccountPDA(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("liilend-user"), owner.toBuffer()],
    PROGRAM_ID
  );
}

export function deriveVaultPDA(assetMint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("liilend-vault"), assetMint.toBuffer()],
    PROGRAM_ID
  );
}

export function deriveUserCollateralPDA(
  owner: PublicKey,
  assetMint: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("liilend-user"), owner.toBuffer(), assetMint.toBuffer()],
    PROGRAM_ID
  );
}

export function deriveBorrowPositionPDA(
  owner: PublicKey,
  borrowMint: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("liilend-borrow"), owner.toBuffer(), borrowMint.toBuffer()],
    PROGRAM_ID
  );
}

export function derivePriceFeedPDA(assetMint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("liilend-price-feed"), assetMint.toBuffer()],
    PROGRAM_ID
  );
}

export function deriveTreasuryPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("liilend-treasury")],
    PROGRAM_ID
  );
}

export function getDepositShares(
  vault: VaultAccount,
  userCollateral: UserCollateralAccount
): number {
  if (vault.totalShares.isZero()) return 0;
  return Number(userCollateral.shares.toString());
}

export function calculateUserEquity(
  userCollateral: UserCollateralAccount,
  vault: VaultAccount,
  price: number
): number {
  if (vault.totalShares.isZero() || vault.totalValue.isZero()) return 0;

  const shareRatio = Number(userCollateral.shares.toString()) / Number(vault.totalShares.toString());
  const poolValue = Number(vault.totalValue.toString()) * price;
  return shareRatio * poolValue;
}

export function calculateBorrowLimit(
  collateralValueUsd: number,
  maxLtvBps: number
): number {
  return collateralValueUsd * (maxLtvBps / 10_000);
}

export function calculateHealthFactor(
  totalBorrowedUsd: number,
  totalCollateralUsd: number,
  liquidationThresholdBps: number
): number {
  if (totalBorrowedUsd === 0) return 100;
  const maxDebtAllowed = totalCollateralUsd * (liquidationThresholdBps / 10_000);
  return maxDebtAllowed / totalBorrowedUsd;
}

export function calculateUtilizationRate(
  totalBorrows: BN,
  totalDeposits: BN
): number {
  if (totalDeposits.isZero()) return 0;
  return Number(totalBorrows.toString()) / Number(totalDeposits.toString());
}
