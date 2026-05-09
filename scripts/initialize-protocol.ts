import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionSignature,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { Program, AnchorProvider, Wallet, Idl } from "@coral-xyz/anchor";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import BN from "bn.js";
import {
  PROGRAM_ID,
  RPC_URL,
  CLUSTER,
  SEEDS,
  ASSET_CONFIGS,
  MULTISIG_AUTHORITY,
  CONFIRMATION_TIMEOUT,
  OracleSource,
} from "./constants";

// ── Setup ─────────────────────────────────────────────────────────────────────
function loadDeployerKeypair(): Keypair {
  const keyPath =
    process.env.DEPLOYER_KEYPAIR_PATH ||
    path.join(os.homedir(), ".config/solana/id.json");
  const secret = JSON.parse(fs.readFileSync(keyPath, "utf-8"));
  return Keypair.fromSecretKey(Buffer.from(secret));
}

async function getProgram(connection: Connection, wallet: Wallet): Promise<Program> {
  const idlPath = path.join(__dirname, "..", "target", "idl", "liilend.json");
  if (!fs.existsSync(idlPath)) {
    throw new Error(
      `IDL not found at ${idlPath}. Run "anchor build" first.`
    );
  }
  const idl: Idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  return new Program(idl, provider);
}

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

// ── Instructions ──────────────────────────────────────────────────────────────
async function initProtocol(
  program: Program,
  authority: Keypair
): Promise<TransactionSignature> {
  const [protocolStatePda] = findProtocolStatePda();
  const [treasuryPda] = findTreasuryPda();

  const tx = await program.methods
    .initProtocol()
    .accountsStrict({
      protocolState: protocolStatePda,
      treasury: treasuryPda,
      payer: authority.publicKey,
      authority: authority.publicKey,
      systemProgram: PublicKey.default, // will be replaced by anchor
    } as any)
    .rpc({ skipPreflight: false });

  return tx;
}

async function configureAsset(
  program: Program,
  authority: Keypair,
  config: (typeof ASSET_CONFIGS)[number],
  assetIndex: number
): Promise<TransactionSignature> {
  const [protocolStatePda] = findProtocolStatePda();
  const [vaultPda] = findVaultPda(config.mint);
  const [priceFeedPda] = findPriceFeedPda(config.mint);

  const tx = await program.methods
    .configureAsset(
      assetIndex,
      ASSET_TYPE_NAMES[config.assetType],
      config.maxLtvBps,
      config.liquidationThresholdBps,
      config.liquidationPenaltyBps,
      config.reserveFactorBps,
      new BN(config.depositCap),
      new BN(config.borrowCap),
      ORACLE_SOURCE_NAMES[config.oracleSource],
      config.pythPriceFeed,
      config.switchboardPriceFeed
    )
    .accountsStrict({
      protocolState: protocolStatePda,
      vault: vaultPda,
      priceFeed: priceFeedPda,
      mint: config.mint,
      payer: authority.publicKey,
      authority: authority.publicKey,
      systemProgram: PublicKey.default,
    } as any)
    .rpc({ skipPreflight: false });

  return tx;
}

async function transferAuthority(
  program: Program,
  currentAuthority: Keypair,
  newAuthorityPubkey: PublicKey
): Promise<TransactionSignature> {
  const [protocolStatePda] = findProtocolStatePda();

  const tx = await program.methods
    .transferAuthority()
    .accountsStrict({
      protocolState: protocolStatePda,
      authority: currentAuthority.publicKey,
      newAuthority: newAuthorityPubkey,
    } as any)
    .rpc({ skipPreflight: false });

  return tx;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n  LiiLend Protocol Initialization (${CLUSTER})\n`);

  const connection = new Connection(RPC_URL, "confirmed");
  const authority = loadDeployerKeypair();
  const wallet = new Wallet(authority);

  console.log(`  Deployer:   ${authority.publicKey.toBase58()}`);
  console.log(`  Program ID: ${PROGRAM_ID.toBase58()}\n`);

  const program = await getProgram(connection, wallet);
  const [protocolStatePda] = findProtocolStatePda();
  const [treasuryPda] = findTreasuryPda();

  // ── 1. Initialize Protocol ──────────────────────────────────────────────────
  console.log("  [1/3] Initializing protocol state & treasury...");
  const protocolAccount = await connection.getAccountInfo(protocolStatePda);

  if (protocolAccount) {
    console.log("  Protocol already initialized, skipping.\n");
  } else {
    const sig = await initProtocol(program, authority);
    console.log(`  Signature: ${sig}`);
    console.log(`  ProtocolState: ${protocolStatePda.toBase58()}`);
    console.log(`  Treasury:      ${treasuryPda.toBase58()}\n`);
  }

  // ── 2. Configure Assets ─────────────────────────────────────────────────────
  console.log(`  [2/3] Configuring ${ASSET_CONFIGS.length} assets...\n`);

  for (let i = 0; i < ASSET_CONFIGS.length; i++) {
    const cfg = ASSET_CONFIGS[i];
    const [vaultPda] = findVaultPda(cfg.mint);
    const vaultAccount = await connection.getAccountInfo(vaultPda);

    if (vaultAccount) {
      console.log(`  [${i}] Already configured: ${cfg.mint.toBase58()}`);
      continue;
    }

    console.log(`  [${i}] Configuring asset...`);
    console.log(`       Mint:             ${cfg.mint.toBase58()}`);
    console.log(`       Type:             ${AssetType[cfg.assetType]}`);
    console.log(`       Max LTV:          ${cfg.maxLtvBps / 100}%`);
    console.log(`       Liq. Threshold:   ${cfg.liquidationThresholdBps / 100}%`);
    console.log(`       Vault PDA:        ${vaultPda.toBase58()}`);

    const sig = await configureAsset(program, authority, cfg, i);
    console.log(`       Signature:        ${sig}\n`);
  }

  // ── 3. Transfer Authority ──────────────────────────────────────────────────
  if (MULTISIG_AUTHORITY) {
    console.log(
      `  [3/3] Transferring authority to multisig: ${MULTISIG_AUTHORITY.toBase58()}...`
    );
    const sig = await transferAuthority(program, authority, MULTISIG_AUTHORITY);
    console.log(`  Signature: ${sig}\n`);
  } else {
    console.log(
      "  [3/3] Skipping authority transfer (MULTISIG_AUTHORITY not set).\n"
    );
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log("  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   Initialization Complete");
  console.log("  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`   ProtocolState: ${protocolStatePda.toBase58()}`);
  console.log(`   Treasury:      ${treasuryPda.toBase58()}`);
  console.log(`   Assets:        ${ASSET_CONFIGS.length} configured`);
  console.log("  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main().catch((err) => {
  console.error("Initialization failed:", err);
  process.exit(1);
});

// ── Enum helpers ──────────────────────────────────────────────────────────────
enum AssetType {
  Collateral = 0,
  Borrowable = 1,
  Both = 2,
}

const ASSET_TYPE_NAMES: Record<number, { [key: string]: {} }> = {
  [AssetType.Collateral]: { collateral: {} },
  [AssetType.Borrowable]: { borrowable: {} },
  [AssetType.Both]: { both: {} },
};

const ORACLE_SOURCE_NAMES: Record<number, { [key: string]: {} }> = {
  [OracleSource.Pyth]: { pyth: {} },
  [OracleSource.Switchboard]: { switchboard: {} },
};
