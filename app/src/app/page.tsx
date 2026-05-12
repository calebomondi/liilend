"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Activity, Sun, Moon } from 'lucide-react';
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Connection, PublicKey, LAMPORTS_PER_SOL, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
  createCloseAccountInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import toast from "react-hot-toast";
import { WalletButton } from "@/components/WalletButton";
import { MobileMenu } from "@/components/Navbar";
import { useProgram } from "@/hooks/useProgram";
import { SUPPORTED_ASSETS, MOCK_PRICES } from "@/utils/constants";
import {
  deriveProtocolStatePDA,
  deriveUserCollateralPDA,
  deriveBorrowPositionPDA,
  deriveVaultPDA,
  deriveUserAccountPDA,
  getVaultAccount,
} from "@/lib/protocol";

const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
const USDC_MINT = new PublicKey("F88tFzVdURKCKzLWqGAu9omz5GsHAURbGcrrL4EK8CKZ");
const PROGRAM_ID_STR = "BrtmpQXVMryfdrtTQLxFaJtSTa78nULPuxJcQfFznpQc";

const MINT_MAP: Record<string, { symbol: string; decimals: number }> = {};
for (const a of SUPPORTED_ASSETS) {
  MINT_MAP[a.mint] = { symbol: a.symbol, decimals: a.decimals };
}
MINT_MAP["mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So"] = { symbol: "mSOL", decimals: 9 };
MINT_MAP["FHRiYWEh6Uzr8oc2i8TC29CVRTxYhkRkuSrmuFb67hjX"] = { symbol: "USDT", decimals: 6 };

const EVENT_DISCS = {
  deposit: new Uint8Array([120, 248, 61, 83, 31, 142, 107, 144]),
  withdraw: new Uint8Array([22, 9, 133, 26, 160, 44, 71, 192]),
  borrow: new Uint8Array([86, 8, 140, 206, 215, 179, 118, 201]),
  repay: new Uint8Array([129, 213, 0, 108, 218, 108, 82, 140]),
};

function matchDiscriminator(data: Buffer, disc: Uint8Array): boolean {
  if (data.length < 8) return false;
  for (let i = 0; i < 8; i++) { if (data[i] !== disc[i]) return false; }
  return true;
}

type Asset = {
  symbol: string;
  amount: number;
  usdValue: number;
  bgColor: string;
  icon: string;
};

type TxEvent = "Deposit" | "Withdraw" | "Borrow" | "Repay";

type Transaction = {
  id: string;
  type: TxEvent;
  asset: string;
  amount: string;
  date: string;
  status: "confirmed" | "pending";
};

type ModalMode = "deposit" | "withdraw";

const assetIcons: Record<string, string> = {
    SOL: "/assets/solana.png",
    ETH: "/assets/ethereum.png",
    BTC: "/assets/bitcoin.png",
    jitoSOL: "/assets/solana.png",
}

function parseEventLog(log: string): { type: TxEvent; asset: string; amount: string } | null {
  if (!log.startsWith("Program data: ")) return null;
  let data: Buffer;
  try { data = Buffer.from(log.slice("Program data: ".length), "base64"); } catch { return null; }
  if (data.length < 80) return null;

  const assetBytes = data.slice(40, 72);
  const assetPk = new PublicKey(assetBytes).toBase58();
  const info = MINT_MAP[assetPk];
  if (!info) return null;

  const amountRaw = Number(data.readBigUInt64LE(72));
  const humanAmount = amountRaw / (10 ** info.decimals);
  const prefix = humanAmount >= 0 ? "+" : "";
  const fmt = `${prefix}${humanAmount.toFixed(info.decimals === 6 ? 2 : 4)} ${info.symbol}`;

  if (matchDiscriminator(data, EVENT_DISCS.deposit))  return { type: "Deposit",  asset: info.symbol, amount: fmt };
  if (matchDiscriminator(data, EVENT_DISCS.withdraw)) return { type: "Withdraw", asset: info.symbol, amount: fmt };
  if (matchDiscriminator(data, EVENT_DISCS.borrow))   return { type: "Borrow",   asset: info.symbol, amount: fmt };
  if (matchDiscriminator(data, EVENT_DISCS.repay))    return { type: "Repay",    asset: info.symbol, amount: fmt };
  return null;
}

function formatBlockTime(blockTime: number | null | undefined): string {
  if (!blockTime) return "Unknown";
  const date = new Date(blockTime * 1000);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const h = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  return `${d}/${m} ${h}:${min}`;
}

async function fetchTxHistory(connection: Connection, walletPk: PublicKey): Promise<Transaction[]> {
  const sigs = await connection.getSignaturesForAddress(walletPk, { limit: 10 });
  const txs = await Promise.all(
    sigs.map(s => connection.getTransaction(s.signature, { maxSupportedTransactionVersion: 0 }))
  );
  const results: Transaction[] = [];
  for (const tx of txs) {
    if (!tx || tx.meta?.err) continue;
    const involvesProgram = tx.transaction.message.staticAccountKeys.some(
      k => k.toBase58() === PROGRAM_ID_STR
    );
    if (!involvesProgram) continue;
    for (const log of tx.meta?.logMessages || []) {
      const parsed = parseEventLog(log);
      if (parsed) {
        results.push({ ...parsed, id: tx.transaction.signatures[0], date: formatBlockTime(tx.blockTime), status: "confirmed" });
        break;
      }
    }
  }
  return results;
}

const txMeta: Record<Transaction["type"], { bg: string; text: string; label: string }> = {
  Deposit:  { bg: "bg-green-500/10", text: "text-green-400",  label: "D" },
  Borrow:   { bg: "bg-red-500/10",   text: "text-red-400",    label: "B" },
  Repay:    { bg: "bg-blue-500/10",  text: "text-blue-400",   label: "R" },
  Withdraw: { bg: "bg-amber-500/10", text: "text-amber-400",  label: "W" },
};

function StatItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[15px] uppercase tracking-widest text-[var(--text-secondary)] font-mono">{label}</span>
      <span className={`text-[25px] font-bold tracking-tight ${color || "text-[var(--text-primary)]"}`}>
        {value}
      </span>
    </div>
  );
}

function AssetBadge({ asset }: { asset: Asset }) {
  return (
    <div className="flex items-center gap-2 bg-[var(--bg-card-alt)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 flex-1 min-w-[120px] cursor-pointer hover:opacity-80 transition-all duration-200">
      <div className={`w-8 h-8 rounded-full ${asset.bgColor} flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-lg`}>
        {assetIcons[asset.symbol] ? (
          <img src={assetIcons[asset.symbol]} alt={asset.symbol} className="" />
        ) : (
          asset.icon
        )}
      </div>
      <div>
        <div className="text-sm font-semibold text-[var(--text-primary)]">
          {asset.amount} {asset.symbol}
        </div>
        <div className="text-[15px] text-[var(--text-secondary)] font-mono">${asset.usdValue}</div>
      </div>
    </div>
  );
}

function TxRow({ tx }: { tx: Transaction }) {
  const meta = txMeta[tx.type];
  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--border-subtle)] last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl ${meta.bg} ${meta.text} flex items-center justify-center text-xs font-bold font-mono shrink-0`}>
          {meta.label}
        </div>
        <div>
          <div className="text-[13px] font-semibold text-[var(--text-primary)]">
            {tx.type} · {tx.asset}
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] font-mono mt-0.5">{tx.date}</div>
        </div>
      </div>
      <div className="text-right">
        <div className={`text-[13px] font-semibold font-mono ${tx.amount.startsWith("+") ? "text-green-400" : "text-red-400"}`}>
          {tx.amount}
        </div>
        <div className={`text-[10px] uppercase tracking-widest font-mono mt-0.5 ${tx.status === "confirmed" ? "text-green-500" : "text-amber-400"}`}>
          {tx.status}
        </div>
      </div>
    </div>
  );
}

// ─── Theme Toggle ──────────────────────────────────────────────────────────────

function ThemeToggle() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const stored = localStorage.getItem("liidia-theme");
    const isDark = stored ? stored === "dark" : true;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);
  return (
    <button
      onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle("dark", next);
        localStorage.setItem("liidia-theme", next ? "dark" : "light");
      }}
      className="w-9 h-9 rounded-xl bg-[var(--bg-toggle)] border border-[var(--border-subtle)] flex items-center justify-center hover:opacity-80 transition-all shrink-0"
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? <Sun size={16} className="text-[var(--text-secondary)]" /> : <Moon size={16} className="text-[var(--text-secondary)]" />}
    </button>
  );
}

// ─── Deposit/Withdraw Modal ────────────────────────────────────────────────────

function DepositWithdrawModal({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { setVisible: showWalletModal } = useWalletModal();
  const { program, ready } = useProgram();

  const [mode, setMode] = useState<ModalMode>("deposit");
  const [amount, setAmount] = useState("");
  const [solBalance, setSolBalance] = useState(0);
  const [depositedSol, setDepositedSol] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    if (!publicKey) { setSolBalance(0); return; }
    connection.getBalance(publicKey).then(b => setSolBalance(b / LAMPORTS_PER_SOL));
    const sub = connection.onAccountChange(publicKey, ai => setSolBalance(ai.lamports / LAMPORTS_PER_SOL));
    return () => { connection.removeAccountChangeListener(sub); };
  }, [connection, publicKey]);

  useEffect(() => {
    if (!ready || !program || !publicKey) { setDepositedSol(0); return; }
    (async () => {
      try {
        const [cPda] = deriveUserCollateralPDA(publicKey, SOL_MINT);
        const coll = await (program as any).account.userCollateralAccount.fetch(cPda);
        const shares = toBigInt(coll.shares);
        if (shares > 0n) {
          const vault = await getVaultAccount(program as any, SOL_MINT);
          if (vault) {
            const ts = toBigInt(vault.totalShares);
            const tv = toBigInt(vault.totalValue);
            const amt = sharesToAmount(shares, ts, tv);
            setDepositedSol(Number(amt) / LAMPORTS_PER_SOL);
            return;
          }
        }
        setDepositedSol(0);
      } catch { setDepositedSol(0); }
    })();
  }, [ready, program, publicKey]);

  function close() {
    setVisible(false);
    setTimeout(onClose, 260);
  }

  function amountToShares(amount: bigint, totalShares: bigint, totalValue: bigint): bigint {
    if (totalShares === 0n || totalValue === 0n) return amount;
    return amount * totalShares / totalValue;
  }

  async function handleDeposit() {
    if (!publicKey || !program || !ready) return;
    const lamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);
    if (lamports <= 0) { toast.error("Invalid amount"); return; }
    if (lamports > solBalance * LAMPORTS_PER_SOL) { toast.error("Insufficient SOL balance"); return; }

    setProcessing(true);
    try {
      const wsolAta = getAssociatedTokenAddressSync(SOL_MINT, publicKey);
      const [vaultPda] = deriveVaultPDA(SOL_MINT);
      const [psPda] = deriveProtocolStatePDA();
      const [userCollateralPda] = deriveUserCollateralPDA(publicKey, SOL_MINT);
      const [userAccountPda] = deriveUserAccountPDA(publicKey);
      const vaultAta = getAssociatedTokenAddressSync(SOL_MINT, vaultPda, true);

      const preIxs: TransactionInstruction[] = [];
      const wsolAtaInfo = await connection.getAccountInfo(wsolAta);
      if (!wsolAtaInfo) {
        preIxs.push(
          createAssociatedTokenAccountInstruction(publicKey, wsolAta, publicKey, SOL_MINT)
        );
      }
      preIxs.push(
        SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: wsolAta, lamports }),
        createSyncNativeInstruction(wsolAta),
      );

      const sig = await (program as any).methods
        .depositCollateral(new BN(lamports))
        .accounts({
          protocolState: psPda,
          vault: vaultPda,
          userCollateral: userCollateralPda,
          userAccount: userAccountPda,
          vaultAta,
          userAta: wsolAta,
          assetMint: SOL_MINT,
          authority: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .preInstructions(preIxs)
        .rpc();

      toast.success("Deposit successful!");
      onSuccess?.();
      close();
    } catch (e: any) {
      console.error("Deposit error", e);
      toast.error(e.message || e.toString());
    } finally {
      setProcessing(false);
    }
  }

  async function handleWithdraw() {
    if (!publicKey || !program || !ready) return;
    const lamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);
    if (lamports <= 0) { toast.error("Invalid amount"); return; }

    setProcessing(true);
    try {
      const vault = await getVaultAccount(program as any, SOL_MINT);
      if (!vault) { toast.error("Vault not found"); return; }

      const ts = toBigInt(vault.totalShares);
      const tv = toBigInt(vault.totalValue);
      const shareAmount = amountToShares(BigInt(lamports), ts, tv);
      if (shareAmount <= 0n) { toast.error("Invalid share amount"); return; }

      const wsolAta = getAssociatedTokenAddressSync(SOL_MINT, publicKey);
      const [vaultPda] = deriveVaultPDA(SOL_MINT);
      const [psPda] = deriveProtocolStatePDA();
      const [userCollateralPda] = deriveUserCollateralPDA(publicKey, SOL_MINT);
      const [userAccountPda] = deriveUserAccountPDA(publicKey);
      const vaultAta = getAssociatedTokenAddressSync(SOL_MINT, vaultPda, true);

      const preIxs: TransactionInstruction[] = [];
      const wsolAtaInfo = await connection.getAccountInfo(wsolAta);
      if (!wsolAtaInfo) {
        preIxs.push(
          createAssociatedTokenAccountInstruction(publicKey, wsolAta, publicKey, SOL_MINT)
        );
      }

      const sig = await (program as any).methods
        .withdrawCollateral(new BN(shareAmount.toString()))
        .accounts({
          protocolState: psPda,
          vault: vaultPda,
          userCollateral: userCollateralPda,
          userAccount: userAccountPda,
          vaultAta,
          userAta: wsolAta,
          assetMint: SOL_MINT,
          authority: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .preInstructions(preIxs)
        .postInstructions([createCloseAccountInstruction(wsolAta, publicKey, publicKey)])
        .rpc();

      toast.success("Withdraw successful!");
      onSuccess?.();
      close();
    } catch (e: any) {
      console.error("Withdraw error", e);
      toast.error(e.message || e.toString());
    } finally {
      setProcessing(false);
    }
  }

  const maxAmount = mode === "deposit" ? solBalance : depositedSol;
  const usdValue = amount
    ? (parseFloat(amount) * MOCK_PRICES.SOL).toLocaleString("en-US", { style: "currency", currency: "USD" })
    : "$0.00";

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-260 ${visible ? "bg-black/60 backdrop-blur-sm" : "bg-black/0"}`}
      onClick={close}
    >
      <div
        className={`w-full max-w-[420px] m-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl transition-all duration-260 ease-out ${visible ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pb-7 pt-7">

          {/* Toggle */}
          <div className="flex justify-center mb-5">
            <div className="flex bg-[var(--bg-toggle)] border border-[var(--border-subtle)] rounded-xl p-1 gap-1">
              {(["deposit", "withdraw"] as ModalMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all duration-200 ${
                    mode === m
                      ? "bg-[var(--bg-active)] border border-[var(--border-muted)] text-[var(--text-primary)] shadow-sm"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Balance info */}
          <div className="flex justify-between mb-3 px-1">
            <span className="text-xs text-[var(--text-secondary)] font-mono">
              Wallet: {solBalance.toFixed(4)} SOL
            </span>
            <span className="text-xs text-[var(--text-secondary)] font-mono">
              Deposited: {depositedSol.toFixed(4)} SOL
            </span>
          </div>

          {/* Amount input */}
          <div className="bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 mb-3 focus-within:border-violet-500/50 transition-colors">
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="flex-1 bg-transparent text-[var(--text-primary)] text-xl font-semibold font-mono placeholder-[var(--text-muted)] outline-none w-0"
                />
                <button
                    onClick={() => setAmount(String(maxAmount))}
                    className="text-[11px] font-bold font-mono text-amber-400 border border-amber-400/30 rounded-md px-2 py-0.5 hover:bg-amber-400/10 transition-colors shrink-0"
                >
                    Max
                </button>
                <span className="text-[var(--text-secondary)] text-sm font-mono shrink-0">SOL</span>
            </div>
            <div className="text-[13px] text-[var(--text-secondary)] font-mono mt-1">{usdValue}</div>
          </div>

          {/* CTA */}
          <button
            disabled={processing}
            onClick={!publicKey ? () => showWalletModal(true) : mode === "deposit" ? handleDeposit : handleWithdraw}
            className={`w-full py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 ${
              !publicKey
                ? "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/30"
                : processing
                ? "bg-slate-700/50 text-[var(--text-secondary)] cursor-not-allowed"
                : mode === "withdraw"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30"
                : "bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30"
            }`}
          >
            {processing ? "Processing..." : !publicKey ? "Connect wallet" : mode === "deposit" ? "Deposit SOL" : "Withdraw SOL"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Spend/Repay Modal ──────────────────────────────────────────────────────

function SpendRepayModal({ onClose, onSuccess, borrowPower, currentDebt }: { onClose: () => void; onSuccess?: () => void; borrowPower: number; currentDebt: number }) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { setVisible: showWalletModal } = useWalletModal();
  const { program, ready } = useProgram();

  type SpendMode = "spend" | "repay" | "offramp";
  const [mode, setMode] = useState<SpendMode>("spend");
  const [amount, setAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState(0);
  const [visible, setVisible] = useState(false);

  const countries = ["Kenya", "Nigeria", "Ghana", "Uganda", "Tanzania", "South Africa", "Rwanda", "Zambia"];
  const currencyInfo: Record<string, { code: string; rate: number }> = {
    Kenya: { code: "KES", rate: 150 },
    Nigeria: { code: "NGN", rate: 1500 },
    Ghana: { code: "GHS", rate: 12 },
    Uganda: { code: "UGX", rate: 3700 },
    Tanzania: { code: "TZS", rate: 2500 },
    "South Africa": { code: "ZAR", rate: 18 },
    Rwanda: { code: "RWF", rate: 1300 },
    Zambia: { code: "ZMW", rate: 25 },
  };
  const mobileProviders: Record<string, string[]> = {
    Kenya: ["M-Pesa", "Airtel Money"],
    Nigeria: ["MTN MoMo", "Airtel Money"],
    Ghana: ["MTN MoMo", "Vodafone Cash"],
    Uganda: ["MTN MoMo", "Airtel Money"],
    Tanzania: ["M-Pesa", "Tigo Pesa", "Airtel Money"],
    "South Africa": ["MTN MoMo", "Vodacom M-Pesa"],
    Rwanda: ["MTN MoMo", "Airtel Money"],
    Zambia: ["MTN MoMo", "Airtel Money"],
  };
  const services = ["Send Money", "Pay Bills", "Buy Goods & Services"];

  const [offCountry, setOffCountry] = useState(countries[0]);
  const [offMethod, setOffMethod] = useState<"mobile" | "bank">("mobile");
  const [offProvider, setOffProvider] = useState("");
  const [offService, setOffService] = useState(services[0]);
  const [offPhone, setOffPhone] = useState("");
  const [offLocalAmount, setOffLocalAmount] = useState(amount);
  const [offConfirmed, setOffConfirmed] = useState(false);

  useEffect(() => {
    setOffProvider(mobileProviders[offCountry]?.[0] || "");
  }, [offCountry]);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    if (!publicKey) { setUsdcBalance(0); return; }
    const usdcAta = getAssociatedTokenAddressSync(USDC_MINT, publicKey);
    connection.getTokenAccountBalance(usdcAta).then(r => setUsdcBalance(Number(r.value.amount) / 1_000_000)).catch(() => setUsdcBalance(0));
  }, [connection, publicKey]);

  function close() {
    setVisible(false);
    setTimeout(onClose, 260);
  }

  const availableBorrow = Math.max(0, borrowPower - currentDebt);
  const maxRepay = Math.min(currentDebt, usdcBalance);

  async function handleBorrow() {
    if (!publicKey || !program || !ready) return;
    const usdAmount = parseFloat(amount);
    if (isNaN(usdAmount) || usdAmount <= 0) { toast.error("Invalid amount"); return; }
    if (usdAmount > availableBorrow) { toast.error("Exceeds borrowing power"); return; }

    setProcessing(true);
    try {
      const [vaultPda] = deriveVaultPDA(USDC_MINT);
      const [psPda] = deriveProtocolStatePDA();
      const [userAccountPda] = deriveUserAccountPDA(publicKey);
      const [bPda] = deriveBorrowPositionPDA(publicKey, USDC_MINT);
      const vaultAta = getAssociatedTokenAddressSync(USDC_MINT, vaultPda, true);
      const userAta = getAssociatedTokenAddressSync(USDC_MINT, publicKey);

      const amountBase = Math.floor(usdAmount * 1_000_000); // USDC 6 decimals

      await (program as any).methods
        .borrowAsset(new BN(amountBase))
        .accounts({
          protocolState: psPda,
          vault: vaultPda,
          userAccount: userAccountPda,
          borrowPosition: bPda,
          vaultAta,
          userAta,
          borrowMint: USDC_MINT,
          collateralPriceFeed: PublicKey.default,
          borrowPriceFeed: PublicKey.default,
          authority: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setMode("offramp");
      toast.success("Borrowed! Off-ramping...");
    } catch (e: any) {
      console.error("Borrow error", e);
      toast.error(e.message || e.toString());
    } finally {
      setProcessing(false);
    }
  }

  async function handleRepay() {
    if (!publicKey || !program || !ready) return;
    const usdAmount = parseFloat(amount);
    if (isNaN(usdAmount) || usdAmount <= 0) { toast.error("Invalid amount"); return; }
    if (usdAmount > maxRepay) { toast.error("Exceeds repayable amount"); return; }

    setProcessing(true);
    try {
      const [vaultPda] = deriveVaultPDA(USDC_MINT);
      const [psPda] = deriveProtocolStatePDA();
      const [userAccountPda] = deriveUserAccountPDA(publicKey);
      const [bPda] = deriveBorrowPositionPDA(publicKey, USDC_MINT);
      const vaultAta = getAssociatedTokenAddressSync(USDC_MINT, vaultPda, true);
      const userAta = getAssociatedTokenAddressSync(USDC_MINT, publicKey);

      const amountBase = Math.floor(usdAmount * 1_000_000);

      await (program as any).methods
        .repayDebt(new BN(amountBase))
        .accounts({
          protocolState: psPda,
          vault: vaultPda,
          borrowPosition: bPda,
          userAccount: userAccountPda,
          vaultAta,
          userAta,
          repayMint: USDC_MINT,
          authority: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      toast.success("Repaid successfully!");
      onSuccess?.();
      close();
    } catch (e: any) {
      console.error("Repay error", e);
      toast.error(e.message || e.toString());
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-260 ${visible ? "bg-black/60 backdrop-blur-sm" : "bg-black/0"}`}
      onClick={close}
    >
      <div
        className={`w-full max-w-[420px] m-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl transition-all duration-260 ease-out ${visible ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pb-7 pt-7">

          {mode === "offramp" ? (
            offConfirmed ? (
              <>
                <div className="text-center py-4">
                  <div className="text-3xl mb-3">✅</div>
                  <div className="text-base font-bold text-[var(--text-primary)] mb-2">Off-ramp Complete</div>
                  <div className="text-xs text-[var(--text-secondary)] font-mono leading-relaxed">
                    {parseFloat(amount).toFixed(2)} USDC → {currencyInfo[offCountry]?.code || "Local"} {parseFloat(offLocalAmount || "0").toLocaleString()}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] font-mono mt-1">
                    via {offProvider} · {offService}
                  </div>
                  {offService === "Send Money" && offPhone && (
                    <div className="text-xs text-[var(--text-secondary)] font-mono mt-1">
                      to {offPhone}
                    </div>
                  )}
                  <div className="mt-5 text-xs text-slate-600 font-mono border-t border-[var(--border-subtle)] pt-4">
                    💰 USDC remains in your wallet · partner off-ramp simulated
                  </div>
                  <button onClick={() => { onSuccess?.(); close(); }}
                    className="mt-4 w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-all shadow-lg shadow-violet-600/30"
                  >
                    OK
                  </button>
                </div>
              </>
            ) : (
            <>
              <div className="text-center mb-4">
                <div className="text-base font-bold text-[var(--text-primary)] mb-1">Off-ramp to Fiat</div>
                <div className="text-xs text-[var(--text-secondary)] font-mono">${parseFloat(amount).toFixed(2)} USDC borrowed → in your wallet</div>
              </div>

              <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1">
                {/* Country */}
                <div>
                  <label className="text-[11px] uppercase tracking-widest text-[var(--text-secondary)] font-mono mb-1.5 block">Country</label>
                  <div className="flex flex-wrap gap-1.5">
                    {countries.map(c => (
                      <button key={c} onClick={() => setOffCountry(c)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          offCountry === c ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "bg-[var(--bg-toggle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-white/[0.15]"
                        }`}
                      >{c}</button>
                    ))}
                  </div>
                </div>

                {/* Method */}
                <div>
                  <label className="text-[11px] uppercase tracking-widest text-[var(--text-secondary)] font-mono mb-1.5 block">Off-ramp Method</label>
                  <div className="flex gap-2">
                    {(["mobile", "bank"] as const).map(m => (
                      <button key={m} onClick={() => setOffMethod(m)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                          offMethod === m ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "bg-[var(--bg-toggle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                        }`}
                      >{m === "mobile" ? "Mobile Money" : "Bank Transfer"}</button>
                    ))}
                  </div>
                </div>

                {/* Provider */}
                <div>
                  <label className="text-[11px] uppercase tracking-widest text-[var(--text-secondary)] font-mono mb-1.5 block">{offMethod === "mobile" ? "Provider" : "Bank"}</label>
                  <div className="flex flex-wrap gap-1.5">
                    {(offMethod === "mobile" ? mobileProviders[offCountry] || [] : ["Equity Bank", "KCB", "Co-op Bank", "Absa"]).map(p => (
                      <button key={p} onClick={() => setOffProvider(p)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          offProvider === p ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "bg-[var(--bg-toggle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-white/[0.15]"
                        }`}
                      >{p}</button>
                    ))}
                  </div>
                </div>

                {/* Service */}
                <div>
                  <label className="text-[11px] uppercase tracking-widest text-[var(--text-secondary)] font-mono mb-1.5 block">Service</label>
                  <div className="flex flex-wrap gap-1.5">
                    {services.map(s => (
                      <button key={s} onClick={() => setOffService(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          offService === s ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "bg-[var(--bg-toggle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-white/[0.15]"
                        }`}
                      >{s}</button>
                    ))}
                  </div>
                </div>

                {/* Send Money fields */}
                {offService === "Send Money" && (
                  <>
                    <div>
                      <label className="text-[11px] uppercase tracking-widest text-[var(--text-secondary)] font-mono mb-1.5 block">Phone Number</label>
                      <div className="bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl px-3 py-2.5 focus-within:border-violet-500/50 transition-colors">
                        <input type="tel" placeholder="+254 7XX XXX XXX" value={offPhone} onChange={e => setOffPhone(e.target.value)}
                          className="w-full bg-transparent text-[var(--text-primary)] text-sm font-mono placeholder-[var(--text-muted)] outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-widest text-[var(--text-secondary)] font-mono mb-1.5 block">Amount ({currencyInfo[offCountry]?.code || "Local"})</label>
                      <div className="bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl px-3 py-2.5 focus-within:border-violet-500/50 transition-colors">
                        <input type="text" placeholder="0.00" value={offLocalAmount} onChange={e => setOffLocalAmount(e.target.value)}
                          className="w-full bg-transparent text-[var(--text-primary)] text-sm font-mono placeholder-[var(--text-muted)] outline-none"
                        />
                      </div>
                      {offLocalAmount && parseFloat(offLocalAmount) > 0 && (
                        <div className="text-[11px] text-[var(--text-secondary)] font-mono mt-1 text-right">
                          ≈ ${(parseFloat(offLocalAmount) / (currencyInfo[offCountry]?.rate || 1)).toFixed(2)} USD
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="mt-4 text-[11px] text-[var(--text-secondary)] font-mono text-center">
                💰 USDC already in your wallet · simulating partner off-ramp
              </div>

              <button onClick={() => setOffConfirmed(true)}
                className="mt-3 w-full py-3 rounded-xl bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30 text-sm font-bold transition-all"
              >
                Complete
              </button>
            </>
            )
          ) : (
            <>
              {/* Toggle */}
              <div className="flex justify-center mb-5">
                <div className="flex bg-[var(--bg-toggle)] border border-[var(--border-subtle)] rounded-xl p-1 gap-1">
                  {(["spend", "repay"] as SpendMode[]).filter(m => m !== "offramp").map(m => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all duration-200 ${
                        mode === m
                          ? "bg-[var(--bg-active)] border border-[var(--border-muted)] text-[var(--text-primary)] shadow-sm"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {m === "spend" ? "Spend" : "Repay"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Info */}
              <div className="flex justify-between mb-3 px-1">
                {mode === "spend" ? (
                  <>
                    <span className="text-xs text-[var(--text-secondary)] font-mono">Available: ${availableBorrow.toFixed(2)}</span>
                    <span className="text-xs text-[var(--text-secondary)] font-mono">Debt: ${currentDebt.toFixed(2)}</span>
                  </>
                ) : (
                  <>
                    <span className="text-xs text-[var(--text-secondary)] font-mono">Debt: ${currentDebt.toFixed(2)}</span>
                    <span className="text-xs text-[var(--text-secondary)] font-mono">USDC: {usdcBalance.toFixed(2)}</span>
                  </>
                )}
              </div>

              {/* Input */}
              <div className="bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 mb-3 focus-within:border-violet-500/50 transition-colors">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="flex-1 bg-transparent text-[var(--text-primary)] text-xl font-semibold font-mono placeholder-[var(--text-muted)] outline-none w-0"
                  />
                  <button
                    onClick={() => mode === "spend" ? setAmount(String(availableBorrow)) : setAmount(String(maxRepay))}
                    className="text-[11px] font-bold font-mono text-violet-400 border border-violet-400/30 rounded-md px-2 py-0.5 hover:bg-violet-400/10 transition-colors shrink-0"
                  >
                    Max
                  </button>
                  <span className="text-[var(--text-secondary)] text-sm font-mono shrink-0">USD</span>
                </div>
                <div className="text-[13px] text-[var(--text-secondary)] font-mono mt-1">
                  ~{(parseFloat(amount || "0")).toFixed(2)} USDC
                </div>
              </div>

              {/* CTA */}
              <button
                disabled={processing}
                onClick={!publicKey ? () => showWalletModal(true) : mode === "spend" ? handleBorrow : handleRepay}
                className={`w-full py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 ${
                  !publicKey
                    ? "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/30"
                    : processing
                    ? "bg-slate-700/50 text-[var(--text-secondary)] cursor-not-allowed"
                    : mode === "repay"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30"
                    : "bg-violet-500/20 text-violet-300 border border-violet-500/30 hover:bg-violet-500/30"
                }`}
              >
                {processing ? "Processing..." : !publicKey ? "Connect wallet" : mode === "spend" ? `Spend $${amount || "0"}` : `Repay $${amount || "0"}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

type CollateralPosition = {
  symbol: string;
  amount: number;
  usdValue: number;
  bgColor: string;
  icon: string;
};

function toBigInt(val: any): bigint {
  if (val == null) return 0n;
  if (typeof val === "bigint") return val;
  if (typeof val === "number") return BigInt(val);
  if (val.toString) return BigInt(val.toString());
  return BigInt(val);
}

function sharesToAmount(shares: bigint, totalShares: bigint, totalValue: bigint): bigint {
  if (totalShares === 0n) return 0n;
  return shares * totalValue / totalShares;
}

function baseUnitsToUsd(amount: bigint, decimals: number, price: number): number {
  return Number(amount) * price / (10 ** decimals);
}

const assetBgColors: Record<string, string> = {
  SOL: "bg-purple-600",
  ETH: "bg-indigo-500",
  BTC: "bg-orange-500",
  jitoSOL: "bg-green-600",
  USDC: "bg-blue-500",
  USDT: "bg-teal-500",
};

const assetIconsMap: Record<string, string> = {
  SOL: "◎",
  ETH: "⟠",
  BTC: "₿",
  jitoSOL: "◎",
  USDC: "₵",
  USDT: "₮",
};

export default function LiidiaPage() {
  const [debugErr, setDebugErr] = useState<string | null>(null);
  useEffect(() => {
    const handler = (e: ErrorEvent) => {
      setDebugErr(e.message + " at " + (e.filename || "?") + ":" + e.lineno);
    };
    const rejHandler = (e: PromiseRejectionEvent) => {
      setDebugErr("UNHANDLED REJECTION: " + (e.reason?.message || e.reason));
    };
    window.addEventListener("error", handler);
    window.addEventListener("unhandledrejection", rejHandler);
    return () => {
      window.removeEventListener("error", handler);
      window.removeEventListener("unhandledrejection", rejHandler);
    };
  }, []);

  const { connected, publicKey: walletPk } = useWallet();
  const { connection } = useConnection();
  const { program, ready } = useProgram();

  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showSpendModal, setShowSpendModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [loading, setLoading] = useState(false);
  const [userTvl, setUserTvl] = useState(0);
  const [userBorrowed, setUserBorrowed] = useState(0);
  const [userBorrowingPower, setUserBorrowingPower] = useState(0);
  const [userHealthFactor, setUserHealthFactor] = useState(0);
  const [collateralPositions, setCollateralPositions] = useState<CollateralPosition[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  const pathname = usePathname();

  useEffect(() => {
    if (!ready || !program || !walletPk) return;
    setLoading(true);
    (async () => {
      try {
        const acc = (program as any).account;
        const [psPda] = deriveProtocolStatePDA();
        let ps: any = null;
        try { ps = await acc.protocolState.fetch(psPda); } catch {}

        const colls: CollateralPosition[] = [];
        let totalCollateralUsd = 0;
        let totalBorrowingPowerUsd = 0;
        let totalLiquidationUsd = 0;

        for (const asset of SUPPORTED_ASSETS) {
          if (asset.symbol === "USDC" || asset.symbol === "USDT") continue;
          const mint = new PublicKey(asset.mint);
          const [cPda] = deriveUserCollateralPDA(walletPk, mint);
          try {
            const coll = await acc.userCollateralAccount.fetch(cPda);
            const shares = toBigInt(coll.shares);
            if (shares > 0n) {
              const vault = await getVaultAccount(program as any, mint);
              let amount = 0n;
              let usdValue = 0;
              if (vault) {
                const ts = toBigInt(vault.totalShares);
                const tv = toBigInt(vault.totalValue);
                amount = sharesToAmount(shares, ts, tv);
                usdValue = baseUnitsToUsd(amount, asset.decimals, MOCK_PRICES[asset.symbol] || 0);
              } else {
                amount = shares;
                usdValue = baseUnitsToUsd(amount, asset.decimals, MOCK_PRICES[asset.symbol] || 0);
              }
              totalCollateralUsd += usdValue;
              totalBorrowingPowerUsd += usdValue * (asset.ltv || 0);
              totalLiquidationUsd += usdValue * (asset.liquidationThreshold || 0);
              colls.push({
                symbol: asset.symbol,
                amount: Number(amount) / (10 ** asset.decimals),
                usdValue,
                bgColor: assetBgColors[asset.symbol] || "bg-gray-500",
                icon: assetIconsMap[asset.symbol] || "?",
              });
            }
          } catch {}
        }
        setCollateralPositions(colls);

        let totalBorrowedUsd = 0;
        for (const asset of SUPPORTED_ASSETS) {
          if (asset.symbol !== "USDC" && asset.symbol !== "USDT") continue;
          const mint = new PublicKey(asset.mint);
          const [bPda] = deriveBorrowPositionPDA(walletPk, mint);
          try {
            const bp = await acc.borrowPosition.fetch(bPda);
            const ds = toBigInt(bp.debtShares);
            if (ds > 0n && ps) {
              const gds = toBigInt(ps.globalDebtShares);
              const tbv = toBigInt(ps.totalBorrowsUsd);
              if (gds > 0n) {
                const amount = sharesToAmount(ds, gds, tbv);
                totalBorrowedUsd += baseUnitsToUsd(amount, asset.decimals, 1);
              }
            }
          } catch {}
        }

        setUserTvl(totalCollateralUsd);
        setUserBorrowed(totalBorrowedUsd);
        setUserBorrowingPower(totalBorrowingPowerUsd);
        setUserHealthFactor(totalBorrowedUsd > 0 ? totalLiquidationUsd / totalBorrowedUsd : 99);
      } catch (e) {
        console.error("Dashboard fetch error", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, program, walletPk, refreshTrigger]);

  useEffect(() => {
    if (!walletPk) { setTransactions([]); return; }
    setTxLoading(true);
    fetchTxHistory(connection, walletPk).then(txs => {
      setTransactions(txs);
      setTxLoading(false);
    }).catch(() => setTxLoading(false));
  }, [connection, walletPk, refreshTrigger]);

  return (
    <>
      {debugErr && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999, background: "#ff0040", color: "#fff", padding: "12px", fontSize: "13px", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
          JS Error: {debugErr}
        </div>
      )}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        body { font-family: 'Syne', sans-serif; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.45s ease both; }
        .delay-1 { animation-delay: 0.05s; }
        .delay-2 { animation-delay: 0.12s; }
        .delay-3 { animation-delay: 0.19s; }
        .delay-4 { animation-delay: 0.26s; }
      `}</style>
      <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center">
        <div className="min-w-1/2 min-h-screen bg-[var(--bg-card)] flex flex-col relative overflow-hidden">

          {/* Ambient glow */}
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5">
            <span className="text-[22px] font-extrabold tracking-tight text-[var(--text-primary)]">Liidia</span>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <WalletButton />
              <MobileMenu pathname={pathname} />
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-3">

            {/* Stats card */}
            <div className="fade-up delay-1 bg-[var(--bg-card-alt)] border border-[var(--border-subtle)] rounded-2xl p-5">
              <div className="flex justify-between items-start mb-4">
                <StatItem label="Supplied"   value={`$${userTvl.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
                <StatItem label="Borrowed"   value={`$${userBorrowed.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
                <StatItem label="Available"  value={`$${(userBorrowingPower - userBorrowed).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
                <StatItem label="Health" value={userHealthFactor >= 99 ? "∞" : userHealthFactor.toFixed(2)}
                  color={userHealthFactor >= 2.5 ? "text-green-400" : userHealthFactor >= 2 ? "text-yellow-400" : userHealthFactor >= 1.5 ? "text-orange-400" : "text-red-400"} />
              </div>

              <hr className="border-0 h-[1px] bg-[var(--border-subtle)] mx-4 my-4" />

              <div className="flex items-center justify-between mb-3">
                <span className="text-[15px] uppercase tracking-widest text-[var(--text-secondary)] font-mono font-medium">
                  Supplied Collateral
                </span>
                <button className="text-[var(--text-secondary)] text-base hover:text-[var(--text-primary)] transition-colors">
                    <Activity size={18} />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {loading ? (
                  <div className="col-span-full flex items-center justify-center py-4">
                    <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                    <span className="ml-2 text-sm text-[var(--text-secondary)] font-mono">Loading...</span>
                  </div>
                ) : collateralPositions.length === 0 ? (
                  <p className="col-span-full text-sm text-[var(--text-secondary)] font-mono text-center py-4">
                    {connected ? "No collateral deposited" : "Connect wallet to view"}
                  </p>
                ) : (
                  collateralPositions.map(a => <AssetBadge key={a.symbol} asset={a} />)
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="fade-up delay-3 flex flex-col gap-2.5">
              <button
                onClick={() => setShowDepositModal(true)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-700 to-indigo-600 text-slate-100 text-sm font-semibold tracking-wide hover:from-violet-600 hover:to-indigo-500 hover:shadow-[0_4px_24px_rgba(109,40,217,0.4)] transition-all duration-200"
              >
                Deposit / Withdraw
              </button>
              <button
                onClick={() => setShowSpendModal(true)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-500 text-slate-100 text-sm font-semibold tracking-wide hover:from-amber-500 hover:to-orange-400 hover:shadow-[0_4px_24px_rgba(217,119,6,0.4)] transition-all duration-200"
              >
                Spend / Repay
              </button>
            </div>

            {/* History */}
            <div className="fade-up delay-4 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">🧾</span>
                <span className="text-[11px] uppercase tracking-widest text-[var(--text-secondary)] font-mono font-medium">
                  History · All TXs
                </span>
              </div>
              <div>
                {txLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                    <span className="ml-2 text-sm text-[var(--text-secondary)] font-mono">Loading...</span>
                  </div>
                ) : transactions.length === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)] font-mono text-center py-4">
                    {walletPk ? "No transactions yet" : "Connect wallet to view history"}
                  </p>
                ) : (
                  transactions.map(tx => <TxRow key={tx.id} tx={tx} />)
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showDepositModal && (
        <DepositWithdrawModal
          onClose={() => setShowDepositModal(false)}
          onSuccess={() => setRefreshTrigger(n => n + 1)}
        />
      )}
      {showSpendModal && (
        <SpendRepayModal
          onClose={() => setShowSpendModal(false)}
          onSuccess={() => setRefreshTrigger(n => n + 1)}
          borrowPower={userBorrowingPower}
          currentDebt={userBorrowed}
        />
      )}
    </>
  );
}
