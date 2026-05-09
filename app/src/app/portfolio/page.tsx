"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { PublicKey, Transaction, SystemProgram, Connection } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { createAssociatedTokenAccountIdempotentInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import toast from "react-hot-toast";

import { SUPPORTED_ASSETS, SUPPORTED_FIAT_CURRENCIES, FIAT_TO_USD_RATE, MOCK_PRICES } from "@/utils/constants";
import { useProgram } from "@/hooks/useProgram";
import {
  deriveUserAccountPDA,
  deriveUserCollateralPDA,
  deriveVaultPDA,
  deriveBorrowPositionPDA,
  deriveProtocolStatePDA,
  getVaultAccount,
  calculateHealthFactor,
} from "@/lib/protocol";
import type { FiatCurrency } from "@/types";

function findAta(owner: PublicKey, mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )[0];
}

function toBigInt(val: any): bigint {
  if (val == null) return 0n;
  if (typeof val === "bigint") return val;
  if (typeof val === "number") return BigInt(val);
  if (val.toString) return BigInt(val.toString());
  return BigInt(val);
}

function toStr(val: any): string {
  if (val == null) return "0";
  if (typeof val === "string") return val;
  if (val.toString) return val.toString();
  return String(val);
}

function sharesToAmount(shares: bigint, totalShares: bigint, totalValue: bigint): bigint {
  if (totalShares === 0n) return 0n;
  return shares * totalValue / totalShares;
}

function baseUnitsToUsd(amount: bigint, decimals: number, price: number): number {
  return Number(amount) * price / (10 ** decimals);
}

function usdToFiat(usdValue: number, fiat: FiatCurrency): number {
  return usdValue / (FIAT_TO_USD_RATE[fiat] || 1);
}

const FiatSelector = ({ selected, onChange }: { selected: FiatCurrency; onChange: (f: FiatCurrency) => void }) => (
  <div className="flex flex-wrap gap-1.5">
    {SUPPORTED_FIAT_CURRENCIES.map((f) => (
      <button key={f.code} onClick={() => onChange(f.code)}
        className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all ${
          selected === f.code ? "bg-liilend-500/10 text-liilend-400 border border-liilend-500/20" : "bg-surface-800 text-surface-400 border border-surface-700"
        }`}>
        {f.flag} {f.code}
      </button>
    ))}
  </div>
);

interface CollateralPosition {
  symbol: string; name: string; logo: string; mint: PublicKey;
  shares: any; decimals: number; vault: any;
}

interface BorrowPosition {
  symbol: string; mint: PublicKey; debtShares: any; decimals: number; vault: any;
}

export default function PortfolioPage() {
  const { connected, publicKey: walletPk, signTransaction, sendTransaction } = useWallet();
  const { setVisible } = useWalletModal();
  const { program, ready } = useProgram();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAccount, setHasAccount] = useState(false);
  const [collateralPositions, setCollateralPositions] = useState<CollateralPosition[]>([]);
  const [borrowPositions, setBorrowPositions] = useState<BorrowPosition[]>([]);
  const [displayFiat, setDisplayFiat] = useState<FiatCurrency>("KES");
  const [txPending, setTxPending] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);
  const [protocolState, setProtocolState] = useState<any>(null);
  const [balances, setBalances] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!walletPk) return;
    const conn = (program as any)?.provider?.connection || new Connection("https://api.devnet.solana.com");
    const usdcMint = new PublicKey(SUPPORTED_ASSETS.find(a => a.symbol === "USDC")!.mint);
    const usdcAta = findAta(walletPk, usdcMint);
    conn.getTokenAccountBalance(usdcAta).then((info: any) => {
      setBalances({ USDC: Number(info.value.amount) / 1e6 });
    }).catch(() => setBalances({ USDC: 0 }));
  }, [walletPk, program]);

  interface RepayFormState {
    repayType: "usdc" | "fiat";
    amount: string;
    fiatMethod: "mobile" | "bank";
    accountDetail: string;
  }
  const [repayForms, setRepayForms] = useState<Record<string, RepayFormState>>({});
  const getForm = (mint: string): RepayFormState => repayForms[mint] || { repayType: "usdc", amount: "", fiatMethod: "mobile", accountDetail: "" };
  const setForm = (mint: string, upd: Partial<RepayFormState>) =>
    setRepayForms(p => ({ ...p, [mint]: { ...getForm(mint), ...upd } }));

  const fetchData = useCallback(async () => {
    if (!program || !walletPk) return;
    setLoading(true);
    setError(null);
    try {
      const acc = (program as any).account;
      const [uaPda] = deriveUserAccountPDA(walletPk);
      let ua: any = null;
      try { ua = await acc.userAccount.fetch(uaPda); } catch { ua = null; }
      setHasAccount(ua != null);

      try {
        const [psPda] = deriveProtocolStatePDA();
        const ps = await acc.protocolState.fetch(psPda);
        setProtocolState(ps);
      } catch {}

      const colls: CollateralPosition[] = [];
      const borrows: BorrowPosition[] = [];

      for (const asset of SUPPORTED_ASSETS) {
        const mint = new PublicKey(asset.mint);
        let vault: any = null;
        try { vault = await getVaultAccount(program as any, mint); } catch {}

        const [cPda] = deriveUserCollateralPDA(walletPk, mint);
        try {
          const coll = await acc.userCollateralAccount.fetch(cPda);
          if (toBigInt(coll.shares) > 0n) {
            colls.push({ symbol: asset.symbol, name: asset.name, logo: asset.logo, mint, shares: coll.shares, decimals: asset.decimals, vault });
          }
        } catch {}

        if (asset.symbol === "USDC" || asset.symbol === "USDT") {
          const [bPda] = deriveBorrowPositionPDA(walletPk, mint);
          try {
            const bp = await acc.borrowPosition.fetch(bPda);
            if (toBigInt(bp.debtShares) > 0n) {
              borrows.push({ symbol: asset.symbol, mint, debtShares: bp.debtShares, decimals: asset.decimals, vault });
            }
          } catch {}
        }
      }

      setCollateralPositions(colls);
      setBorrowPositions(borrows);
    } catch (e: any) {
      setError(e.message || "Failed to fetch portfolio data");
    } finally {
      setLoading(false);
    }
  }, [program, walletPk]);

  useEffect(() => { if (ready) fetchData(); }, [ready, fetchData]);

  const totalCollateralUsd = collateralPositions.reduce((sum, c) => {
    if (!c.vault) return sum;
    const shares = toBigInt(c.shares);
    const ts = toBigInt(c.vault.totalShares);
    const tv = toBigInt(c.vault.totalValue);
    const amount = sharesToAmount(shares, ts, tv);
    return sum + baseUnitsToUsd(amount, c.decimals, MOCK_PRICES[c.symbol] || 0);
  }, 0);

  const totalBorrowedUsd = borrowPositions.reduce((sum, b) => {
    if (!b.vault) return sum;
    const ds = toBigInt(b.debtShares);
    const ts = toBigInt(b.vault.totalShares);
    const tv = toBigInt(b.vault.totalValue);
    const amount = sharesToAmount(ds, ts, tv);
    return sum + baseUnitsToUsd(amount, b.decimals, 1);
  }, 0);

  const usage = totalCollateralUsd > 0 ? (totalBorrowedUsd / totalCollateralUsd) * 100 : 0;
  const healthFactor = calculateHealthFactor(totalBorrowedUsd, totalCollateralUsd, 8000);

  const handleRepay = useCallback(async (mint: PublicKey, customAmountUsdc?: bigint, isFiat?: boolean) => {
    if (!program || !walletPk || !signTransaction || !sendTransaction) return;
    setTxPending(true);
    const tid = toast.loading("Processing repayment...");
    try {
      const acc = (program as any).account;
      const conn = (program as any).provider.connection;
      const [psPda] = deriveProtocolStatePDA();
      const [vPda] = deriveVaultPDA(mint);
      const [bPda] = deriveBorrowPositionPDA(walletPk, mint);
      const [uaPda] = deriveUserAccountPDA(walletPk);
      const vaultAta = findAta(vPda, mint);
      const userAta = findAta(walletPk, mint);

      let bp: any;
      try { bp = await acc.borrowPosition.fetch(bPda); } catch { toast.error("No borrow position", { id: tid }); setTxPending(false); return; }

      let ps: any;
      try { ps = await acc.protocolState.fetch(psPda); } catch { toast.error("Protocol not found", { id: tid }); setTxPending(false); return; }

      const ds = toBigInt(bp.debtShares);
      const gds = toBigInt(ps.globalDebtShares);
      const tbv = toBigInt(ps.totalBorrowsUsd);
      const debtAmount = sharesToAmount(ds, gds, tbv);

      // Clamp repay amount to debt
      const repayAmount = customAmountUsdc != null
        ? customAmountUsdc > debtAmount ? debtAmount : customAmountUsdc
        : debtAmount;

      if (repayAmount === 0n) { toast.error("No debt to repay", { id: tid }); setTxPending(false); return; }

      // Ensure user ATA exists
      const ataInfo = await conn.getAccountInfo(userAta);
      if (!ataInfo) {
        const tx = new Transaction().add(
          createAssociatedTokenAccountIdempotentInstruction(walletPk, userAta, walletPk, mint),
        );
        const sig = await sendTransaction(tx, conn);
        await conn.confirmTransaction(sig);
      }

      if (isFiat) {
        // Fiat repay: simulate fiat on-ramp, minting the exact USDC amount
        toast.loading(`On-ramping ${displayFiat} via Transak...`, { id: tid });
        await new Promise(r => setTimeout(r, 2000));
        toast.loading(`Exchanging via Stables → USDC...`, { id: tid });
        await new Promise(r => setTimeout(r, 1500));
        toast.success(`Minted ${Number(repayAmount) / 1e6} USDC from fiat!`, { id: tid });
        await new Promise(r => setTimeout(r, 500));
      } else {
        // USDC repay: deduct from user's wallet
        const balInfo = await conn.getTokenAccountBalance(userAta).catch(() => ({ value: { amount: "0" } }));
        const userBal = BigInt(balInfo.value.amount);
        if (userBal < repayAmount) {
          toast.error(`Only ${Number(userBal) / 1e6} USDC in wallet — need ${Number(repayAmount) / 1e6}`, { id: tid });
          setTxPending(false);
          return;
        }
        toast.loading(`Deducting ${Number(repayAmount) / 1e6} USDC from wallet...`, { id: tid });
      }

      const sig = await (program as any).methods
        .repayDebt(new BN(repayAmount.toString()))
        .accountsStrict({
          protocolState: psPda,
          vault: vPda,
          borrowPosition: bPda,
          userAccount: uaPda,
          vaultAta,
          userAta,
          repayMint: mint,
          authority: walletPk,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ skipPreflight: false });

      await conn.confirmTransaction(sig);
      const source = isFiat ? "via fiat on-ramp" : "from wallet";
      setConfirmMsg(`Repaid ${Number(repayAmount) / 1e6} USDC (${source}). Tx: ${sig.slice(0, 8)}...${sig.slice(-8)}`);
      toast.success("Repaid successfully", { id: tid });
      fetchData();
    } catch (e: any) {
      const logs = (e as any)?.logs;
      const errMsg = logs?.find((l: string) => l.includes("Error Code:")) || e.message || String(e);
      toast.error(errMsg.length > 120 ? errMsg.slice(0, 120) + "..." : errMsg, { id: tid });
    } finally {
      setTxPending(false);
    }
  }, [program, walletPk, signTransaction, sendTransaction, fetchData, displayFiat]);

  const fiatPerCollateral = collateralPositions.map(c => {
    if (!c.vault) return { ...c, usdValue: 0, fiatValue: 0 };
    const shares = toBigInt(c.shares);
    const ts = toBigInt(c.vault.totalShares);
    const tv = toBigInt(c.vault.totalValue);
    const amount = sharesToAmount(shares, ts, tv);
    const usdValue = baseUnitsToUsd(amount, c.decimals, MOCK_PRICES[c.symbol] || 0);
    return { ...c, usdValue, fiatValue: usdToFiat(usdValue, displayFiat) };
  });

  const fiatPerBorrow = borrowPositions.map(b => {
    if (!b.vault) return { ...b, usdValue: 0, fiatValue: 0, amount: 0n };
    const ds = toBigInt(b.debtShares);
    const ts = toBigInt(b.vault.totalShares);
    const tv = toBigInt(b.vault.totalValue);
    const amount = sharesToAmount(ds, ts, tv);
    const usdValue = baseUnitsToUsd(amount, b.decimals, 1);
    return { ...b, usdValue, fiatValue: usdToFiat(usdValue, displayFiat), amount };
  });

  const fiatSymbol = SUPPORTED_FIAT_CURRENCIES.find(f => f.code === displayFiat)?.symbol || displayFiat;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Portfolio</h1>
          <p className="text-surface-400 mt-1">Manage your collateral and loans</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-surface-500">Display in</span>
          <FiatSelector selected={displayFiat} onChange={setDisplayFiat} />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">{error}</div>
      )}

      {confirmMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setConfirmMsg(null)}>
          <div className="bg-surface-900 border border-surface-700 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-liilend-500/10 text-liilend-400 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-white text-center font-semibold mb-2">Transaction Confirmed</p>
            <p className="text-surface-400 text-sm text-center mb-6">{confirmMsg}</p>
            <button onClick={() => setConfirmMsg(null)}
              className="w-full py-3 rounded-xl bg-liilend-500 hover:bg-liilend-600 text-white font-semibold transition-all">
              OK
            </button>
            </div>
          </div>
      )}

      {!connected ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <svg className="w-16 h-16 text-surface-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h2 className="text-xl font-semibold text-white mb-2">Connect your wallet</h2>
          <p className="text-surface-400 mb-6">Connect your wallet to view your portfolio.</p>
          <button onClick={() => setVisible(true)} className="px-6 py-3 rounded-xl bg-liilend-500 hover:bg-liilend-600 text-white font-semibold transition-all">Connect Wallet</button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-liilend-500 border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-surface-400">Loading portfolio data...</span>
        </div>
      ) : (
        <>
          {/* Overall Health cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="p-5 rounded-2xl bg-surface-900/80 border border-surface-800">
              <p className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-2">Health Factor</p>
              <p className={`text-3xl font-bold ${
                healthFactor >= 2.0 ? 'text-liilend-400' :
                healthFactor >= 1.5 ? 'text-orange-400' :
                'text-red-400'
              }`}>
                {totalCollateralUsd === 0 ? '—' : healthFactor.toFixed(2)}
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-surface-900/80 border border-surface-800">
              <p className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-2">Collateral</p>
              <p className="text-3xl font-bold text-white">${totalCollateralUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
            </div>
            <div className="p-5 rounded-2xl bg-surface-900/80 border border-surface-800">
              <p className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-2">Borrowed</p>
              <p className="text-3xl font-bold text-white">${totalBorrowedUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              <p className="text-[11px] text-surface-500 mt-1">{fiatSymbol}{usdToFiat(totalBorrowedUsd, displayFiat).toLocaleString(undefined, { maximumFractionDigits: 2 })} {displayFiat}</p>
            </div>
            <div className="p-5 rounded-2xl bg-surface-900/80 border border-surface-800">
              <p className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-2">Usage</p>
              <p className="text-3xl font-bold text-white">{usage.toFixed(1)}%</p>
            </div>
          </div>

          {/* Risk Analysis */}
          <div className="p-6 rounded-2xl bg-surface-900/50 border border-surface-800 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Risk Analysis</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-surface-800/50 border border-surface-700/50">
                <p className="text-xs text-surface-400 mb-1">Liquidation Risk</p>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${healthFactor > 2 ? 'bg-liilend-400' : healthFactor > 1.5 ? 'bg-yellow-400' : 'bg-red-400'}`} />
                  <span className="text-sm font-medium text-white">
                    {totalCollateralUsd === 0 ? '—' : healthFactor > 2 ? 'Low' : healthFactor > 1.5 ? 'Medium' : 'High'}
                  </span>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-surface-800/50 border border-surface-700/50">
                <p className="text-xs text-surface-400 mb-1">Concentration</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-400" />
                  <span className="text-sm font-medium text-white">{collateralPositions.length <= 1 ? 'High' : 'Medium'}</span>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-surface-800/50 border border-surface-700/50">
                <p className="text-xs text-surface-400 mb-1">Portfolio Score</p>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${healthFactor > 1.5 ? 'bg-liilend-400' : 'bg-red-400'}`} />
                  <span className="text-sm font-medium text-white">{totalCollateralUsd === 0 ? '—' : healthFactor > 2 ? 'A' : healthFactor > 1.5 ? 'B' : 'C'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Deposited Collateral */}
          <div className="p-6 rounded-2xl bg-surface-900/50 border border-surface-800 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Deposited Collateral</h2>
            {fiatPerCollateral.length === 0 ? (
              <div className="text-center py-8"><p className="text-surface-500 text-sm">No collateral deposited yet</p></div>
            ) : (
              <div className="space-y-3">
                {fiatPerCollateral.map((c) => (
                  <div key={c.symbol} className="flex items-center gap-4 p-4 rounded-xl bg-surface-800/50 border border-surface-700/50">
                    <img src={c.logo} alt={c.symbol} className="w-10 h-10 rounded-full" />
                    <div className="flex-1">
                      <p className="font-semibold text-white">{c.symbol}</p>
                      <p className="text-xs text-surface-400">{c.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-white">${c.usdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                      <p className="text-[10px] text-surface-500">{fiatSymbol}{c.fiatValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} {displayFiat}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Loans + Repay */}
          <div className="p-6 rounded-2xl bg-surface-900/50 border border-surface-800 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Active Loans</h2>
            {fiatPerBorrow.length === 0 ? (
              <div className="text-center py-8"><p className="text-surface-500 text-sm">No active loans</p></div>
            ) : (
              <div className="space-y-4">
                {fiatPerBorrow.map((b) => {
                  const form = getForm(b.mint.toBase58());
                  const debtAmtUsdc = sharesToAmount(
                    toBigInt(b.debtShares),
                    toBigInt(protocolState?.globalDebtShares || 0),
                    toBigInt(protocolState?.totalBorrowsUsd || 0),
                  );
                  const enterAmtBig = form.amount
                    ? BigInt(Math.round(parseFloat(form.amount) * 1e6))
                    : 0n;

                  return (
                    <div key={b.symbol} className="p-4 rounded-xl bg-surface-800/50 border border-surface-700/50">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-white">{b.symbol}</span>
                        <div className="text-right">
                          <p className="text-sm text-white font-medium">${b.usdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                          <p className="text-[10px] text-surface-500">{fiatSymbol}{b.fiatValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} {displayFiat}</p>
                        </div>
                      </div>

                      {/* Repay type toggle */}
                      <div className="flex gap-1.5 mb-3">
                        <button onClick={() => setForm(b.mint.toBase58(), { repayType: "usdc", amount: "", accountDetail: "" })}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${form.repayType === "usdc" ? "bg-liilend-500/10 text-liilend-400 border border-liilend-500/20" : "bg-surface-700/50 text-surface-400 border border-surface-600/50"}`}>
                          Pay with USDC
                        </button>
                        <button onClick={() => setForm(b.mint.toBase58(), { repayType: "fiat", amount: "", accountDetail: "" })}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${form.repayType === "fiat" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-surface-700/50 text-surface-400 border border-surface-600/50"}`}>
                          Pay with {displayFiat}
                        </button>
                      </div>

                      {/* Amount */}
                      <div className="mb-3">
                        <label className="text-[11px] text-surface-400 mb-1 block">Repay amount</label>
                        <div className="flex gap-2">
                          <input type="number" step="any" min="0" placeholder="0.00"
                            value={form.amount}
                            onChange={e => setForm(b.mint.toBase58(), { amount: e.target.value })}
                            className="flex-1 bg-surface-700/50 border border-surface-600 rounded-lg px-3 py-2 text-white text-sm placeholder-surface-500 focus:outline-none focus:border-liilend-500/50" />
                          <span className="text-xs text-surface-400 self-center whitespace-nowrap">
                            {form.repayType === "usdc" ? "USDC" : fiatSymbol}
                          </span>
                        </div>
                        <p className="text-[10px] text-surface-500 mt-1">
                          {form.repayType === "usdc"
                            ? `Wallet: ${(balances[b.symbol] ?? 0).toFixed(2)} USDC`
                            : form.repayType === "fiat"
                              ? ``
                              : `Outstanding: ${Number(debtAmtUsdc) / 1e6} USDC`
                          }
                          {form.repayType === "fiat" && (
                            <>{Number(debtAmtUsdc) / 1e6} USDC ({usdToFiat(Number(debtAmtUsdc) / 1e6, displayFiat).toLocaleString(undefined, { maximumFractionDigits: 2 })} {displayFiat})</>
                          )}
                        </p>
                      </div>

                      {/* Fiat payment details */}
                      {form.repayType === "fiat" && (
                        <div className="mb-3 p-3 rounded-lg bg-surface-700/30 border border-surface-600/50 space-y-2">
                          <div className="flex gap-1.5">
                            <button onClick={() => setForm(b.mint.toBase58(), { fiatMethod: "mobile", accountDetail: "" })}
                              className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all ${form.fiatMethod === "mobile" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-surface-700/50 text-surface-400 border border-surface-600/50"}`}>
                              Mobile Money
                            </button>
                            <button onClick={() => setForm(b.mint.toBase58(), { fiatMethod: "bank", accountDetail: "" })}
                              className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all ${form.fiatMethod === "bank" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-surface-700/50 text-surface-400 border border-surface-600/50"}`}>
                              Bank Transfer
                            </button>
                          </div>
                          <input type="text" placeholder={form.fiatMethod === "mobile" ? "Phone number (e.g. +2547XXXXXXXX)" : "Bank account number"}
                            value={form.accountDetail}
                            onChange={e => setForm(b.mint.toBase58(), { accountDetail: e.target.value })}
                            className="w-full bg-surface-700/50 border border-surface-600 rounded-lg px-3 py-2 text-white text-sm placeholder-surface-500 focus:outline-none focus:border-emerald-500/50" />
                        </div>
                      )}

                      {/* Repay button */}
                      <button onClick={() => {
                        const usdcFromFiat = (fa: number) => BigInt(Math.round(fa * (FIAT_TO_USD_RATE[displayFiat] || 1) * 1e6));
                        const amt = form.repayType === "usdc"
                          ? (enterAmtBig > 0n && enterAmtBig <= debtAmtUsdc ? enterAmtBig : debtAmtUsdc)
                          : form.amount
                            ? (usdcFromFiat(parseFloat(form.amount)) <= debtAmtUsdc ? usdcFromFiat(parseFloat(form.amount)) : debtAmtUsdc)
                            : debtAmtUsdc;
                        handleRepay(b.mint, amt, form.repayType === "fiat");
                      }}
                        disabled={txPending || (form.repayType === "fiat" && !form.accountDetail)}
                        className="w-full py-2 rounded-xl bg-liilend-500 hover:bg-liilend-600 disabled:bg-surface-700 disabled:text-surface-500 text-white text-sm font-medium transition-all">
                        {txPending
                          ? "Processing..."
                          : form.repayType === "usdc"
                            ? `Repay ${enterAmtBig > 0n ? `${Number(enterAmtBig) / 1e6} USDC` : "All USDC"}`
                            : `Repay via ${form.fiatMethod === "mobile" ? "Mobile Money" : "Bank Transfer"}`
                        }
                      </button>

                      {form.repayType === "fiat" && !form.accountDetail && (
                        <p className="text-[10px] text-red-400 mt-1">Enter your {form.fiatMethod === "mobile" ? "phone number" : "bank account"} to continue</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>


        </>
      )}
    </div>
  );
}
