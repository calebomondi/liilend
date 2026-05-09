"use client";

import { useState, useCallback, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { PublicKey, Transaction, SystemProgram, Connection } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import toast from "react-hot-toast";
import { AssetCard } from "@/components/AssetCard";
import {
  SUPPORTED_ASSETS,
  SUPPORTED_FIAT_CURRENCIES,
  FIAT_TO_USD_RATE,
  MOCK_PRICES,
  RPC_ENDPOINT,
} from "@/utils/constants";
import { useProgram } from "@/hooks/useProgram";
import {
  deriveProtocolStatePDA,
  deriveVaultPDA,
  deriveUserAccountPDA,
  deriveUserCollateralPDA,
  deriveBorrowPositionPDA,
} from "@/lib/protocol";
import type { AssetConfig, FiatCurrency } from "@/types";

const WRAPPED_SOL_MINT = NATIVE_MINT;

function findAta(owner: PublicKey, mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )[0];
}

const _conn = new Connection(RPC_ENDPOINT);

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

export default function BorrowPage() {
  const wallet = useWallet();
  const { connected, publicKey: walletPk, signTransaction, sendTransaction } = wallet;
  const { setVisible } = useWalletModal();
  const { program, ready } = useProgram();

  const [selectedAsset, setSelectedAsset] = useState<AssetConfig | null>(null);
  const [selectedFiat, setSelectedFiat] = useState<FiatCurrency>("KES");
  const [depositAmount, setDepositAmount] = useState("");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [txPending, setTxPending] = useState(false);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [fiatDestType, setFiatDestType] = useState<"mobile" | "bank">("mobile");
  const [fiatDestValue, setFiatDestValue] = useState("");

  // On-chain user positions
  const [currentCollateralUsd, setCurrentCollateralUsd] = useState(0);
  const [currentBorrowUsd, setCurrentBorrowUsd] = useState(0);
  const [currentHealthFactor, setCurrentHealthFactor] = useState(3.0);

  // Fetch user wallet token balances
  useEffect(() => {
    if (!walletPk) { setBalances({}); return; }
    const collateralAssets = SUPPORTED_ASSETS.filter((a) => a.ltv > 0);
    Promise.all(
      collateralAssets.map(async (asset) => {
        const mint = new PublicKey(asset.mint);
        const ata = findAta(walletPk, mint);
        if (mint.equals(WRAPPED_SOL_MINT)) {
          const bal = await _conn.getBalance(walletPk);
          return { symbol: asset.symbol, balance: bal / 1e9 };
        }
        const info = await _conn.getTokenAccountBalance(ata).catch(() => null);
        return { symbol: asset.symbol, balance: info ? Number(info.value.amount) / 10 ** asset.decimals : 0 };
      })
    ).then((results) => {
      const map: Record<string, number> = {};
      for (const r of results) map[r.symbol] = r.balance;
      setBalances(map);
    });
  }, [walletPk]);

  // Fetch user's on-chain positions
  useEffect(() => {
    if (!ready || !program || !walletPk) return;
    const acc = (program as any).account;
    const fetchPositions = async () => {
      try {
        let collUsd = 0;
        let borrowUsd = 0;

        for (const asset of SUPPORTED_ASSETS) {
          if (asset.ltv <= 0) continue;
          const mint = new PublicKey(asset.mint);
          const [cPda] = deriveUserCollateralPDA(walletPk, mint);
          try {
            const coll = await acc.userCollateralAccount.fetch(cPda);
            const shares = toBigInt(coll.shares);
            if (shares > 0n) {
              const [vPda] = deriveVaultPDA(mint);
              const vault = await acc.vaultAccount.fetch(vPda);
              const ts = toBigInt(vault.totalShares);
              const tv = toBigInt(vault.totalValue);
              const amt = sharesToAmount(shares, ts, tv);
              collUsd += baseUnitsToUsd(amt, asset.decimals, MOCK_PRICES[asset.symbol] || 0);
            }
          } catch {}
        }

        for (const borrowAsset of SUPPORTED_ASSETS.filter(a => a.symbol === "USDC" || a.symbol === "USDT")) {
          const mint = new PublicKey(borrowAsset.mint);
          const [bPda] = deriveBorrowPositionPDA(walletPk, mint);
          try {
            const bp = await acc.borrowPosition.fetch(bPda);
            const ds = toBigInt(bp.debtShares);
            if (ds > 0n) {
              const [vPda] = deriveVaultPDA(mint);
              const vault = await acc.vaultAccount.fetch(vPda);
              const ts = toBigInt(vault.totalShares);
              const tv = toBigInt(vault.totalValue);
              if (ts > 0n) {
                const amt = sharesToAmount(ds, ts, tv);
                borrowUsd += baseUnitsToUsd(amt, borrowAsset.decimals, 1);
              }
            }
          } catch {}
        }

        setCurrentCollateralUsd(collUsd);
        setCurrentBorrowUsd(borrowUsd);
        const hf = borrowUsd > 0 ? (collUsd * 0.8) / borrowUsd : 3.0;
        setCurrentHealthFactor(hf);
      } catch {}
    };
    fetchPositions();
  }, [ready, program, walletPk]);

  const depositNum = parseFloat(depositAmount) || 0;
  const borrowNum = parseFloat(borrowAmount) || 0;
  const assetPrice = selectedAsset ? MOCK_PRICES[selectedAsset.symbol] || 0 : 0;
  const depositUsd = depositNum * assetPrice;
  const usdRate = FIAT_TO_USD_RATE[selectedFiat];
  const borrowUsd = borrowNum * usdRate;

  const totalCollateralUsd = currentCollateralUsd + depositUsd;
  const totalBorrowUsd = currentBorrowUsd + borrowUsd;
  const projectedHealth = totalBorrowUsd > 0
    ? (totalCollateralUsd * 0.8) / totalBorrowUsd
    : null;

  const effectiveLtv = selectedAsset?.ltv ?? 0.75;
  const maxBorrowFromNewDeposit = depositUsd * effectiveLtv;
  const availableBorrowUsd = currentCollateralUsd * effectiveLtv - currentBorrowUsd + maxBorrowFromNewDeposit;
  const availableBorrowFiat = availableBorrowUsd > 0 ? availableBorrowUsd / usdRate : 0;

  const needsDestInfo = fiatDestType === "bank"
    ? /^.{3,}$/.test(fiatDestValue)
    : /^\+?\d{7,15}$/.test(fiatDestValue);

  const canBorrow = connected && borrowNum > 0 && borrowUsd <= availableBorrowUsd && needsDestInfo;
  const canDeposit = connected && selectedAsset && depositNum > 0;

  const handleDeposit = useCallback(async () => {
    if (!ready || !program || !walletPk || !selectedAsset || !signTransaction || !sendTransaction) return;
    setTxPending(true);
    const tid = toast.loading("Depositing collateral...");
    try {
      const conn = (program as any).provider.connection;
      const mint = new PublicKey(selectedAsset.mint);
      const [psPda] = deriveProtocolStatePDA();
      const [vPda] = deriveVaultPDA(mint);
      const [uaPda] = deriveUserAccountPDA(walletPk);
      const [cPda] = deriveUserCollateralPDA(walletPk, mint);
      const vaultAta = findAta(vPda, mint);
      const userAta = findAta(walletPk, mint);
      const raw = Math.floor(depositNum * 10 ** selectedAsset.decimals);

      // Ensure ATAs
      const tx = new Transaction();
      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(walletPk, vaultAta, vPda, mint),
        createAssociatedTokenAccountIdempotentInstruction(walletPk, userAta, walletPk, mint),
      );
      if (mint.equals(WRAPPED_SOL_MINT)) {
        const balInfo = await conn.getTokenAccountBalance(userAta).catch(() => ({ value: { amount: "0" } }));
        if (parseInt(balInfo.value.amount) < raw + 5_000_000) {
          tx.add(SystemProgram.transfer({ fromPubkey: walletPk, toPubkey: userAta, lamports: raw + 5_000_000 }));
          tx.add(createSyncNativeInstruction(userAta));
        }
      }
      if (tx.instructions.length > 2) {
        const sig = await sendTransaction(tx, conn);
        await conn.confirmTransaction(sig);
      }

      const sig = await (program as any).methods
        .depositCollateral(new BN(raw))
        .accountsStrict({
          protocolState: psPda,
          vault: vPda,
          userCollateral: cPda,
          userAccount: uaPda,
          vaultAta,
          userAta,
          assetMint: mint,
          authority: walletPk,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc({ skipPreflight: false });

      await conn.confirmTransaction(sig);
      toast.success(`Deposited ${depositAmount} ${selectedAsset.symbol}`, { id: tid });
      setDepositAmount("");
    } catch (e: any) {
      const logs = (e as any)?.logs;
      const err = logs?.find((l: string) => l.includes("Error Code:")) || e.message || String(e);
      toast.error(err.length > 120 ? err.slice(0, 120) + "..." : err, { id: tid });
    } finally { setTxPending(false); }
  }, [ready, program, walletPk, signTransaction, sendTransaction, selectedAsset, depositNum, depositAmount]);

  const handleBorrow = useCallback(async () => {
    if (!ready || !program || !walletPk || !signTransaction || !sendTransaction) return;
    setTxPending(true);
    const tid = toast.loading("Borrowing...");
    try {
      const conn = (program as any).provider.connection;
      const usdcMint = new PublicKey(SUPPORTED_ASSETS.find(a => a.symbol === "USDC")!.mint);
      const [psPda] = deriveProtocolStatePDA();
      const [vPda] = deriveVaultPDA(usdcMint);
      const [uaPda] = deriveUserAccountPDA(walletPk);
      const [bPda] = deriveBorrowPositionPDA(walletPk, usdcMint);
      const vaultAta = findAta(vPda, usdcMint);
      const userAta = findAta(walletPk, usdcMint);
      const raw = Math.floor(borrowUsd * 1_000_000);

      const setupTx = new Transaction();
      setupTx.add(
        createAssociatedTokenAccountIdempotentInstruction(walletPk, vaultAta, vPda, usdcMint),
        createAssociatedTokenAccountIdempotentInstruction(walletPk, userAta, walletPk, usdcMint),
      );
      if (setupTx.instructions.length > 0) {
        const sig = await sendTransaction(setupTx, conn);
        await conn.confirmTransaction(sig);
      }

      const sig = await (program as any).methods
        .borrowAsset(new BN(raw))
        .accountsStrict({
          protocolState: psPda,
          vault: vPda,
          userAccount: uaPda,
          borrowPosition: bPda,
          vaultAta,
          userAta,
          borrowMint: usdcMint,
          collateralPriceFeed: PublicKey.default,
          borrowPriceFeed: PublicKey.default,
          authority: walletPk,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc({ skipPreflight: false });

      await conn.confirmTransaction(sig);
      toast.success(`Borrowed ${borrowAmount} ${selectedFiat} (${borrowUsd.toFixed(2)} USDC)`, { id: tid });
      setBorrowAmount("");
    } catch (e: any) {
      const logs = (e as any)?.logs;
      const err = logs?.find((l: string) => l.includes("Error Code:")) || e.message || String(e);
      toast.error(err.length > 120 ? err.slice(0, 120) + "..." : err, { id: tid });
    } finally { setTxPending(false); }
  }, [ready, program, walletPk, signTransaction, sendTransaction, borrowAmount, borrowUsd, selectedFiat]);

  const handleDepositAndBorrow = useCallback(async () => {
    if (!ready || !program || !walletPk || !selectedAsset || !signTransaction || !sendTransaction) return;
    setTxPending(true);
    const tid = toast.loading("Depositing & borrowing...");
    try {
      const conn = (program as any).provider.connection;
      const mint = new PublicKey(selectedAsset.mint);
      const usdcMint = new PublicKey(SUPPORTED_ASSETS.find(a => a.symbol === "USDC")!.mint);
      const rawDeposit = Math.floor(depositNum * 10 ** selectedAsset.decimals);
      const rawBorrow = Math.floor(borrowUsd * 1_000_000);

      const [psPda] = deriveProtocolStatePDA();
      const [vPda] = deriveVaultPDA(mint);
      const [usdcVPda] = deriveVaultPDA(usdcMint);
      const [uaPda] = deriveUserAccountPDA(walletPk);
      const [cPda] = deriveUserCollateralPDA(walletPk, mint);
      const [bPda] = deriveBorrowPositionPDA(walletPk, usdcMint);
      const vaultAta = findAta(vPda, mint);
      const usdcVA = findAta(usdcVPda, usdcMint);
      const userAta = findAta(walletPk, mint);
      const userUsdcAta = findAta(walletPk, usdcMint);

      const setupTx = new Transaction();
      setupTx.add(
        createAssociatedTokenAccountIdempotentInstruction(walletPk, vaultAta, vPda, mint),
        createAssociatedTokenAccountIdempotentInstruction(walletPk, usdcVA, usdcVPda, usdcMint),
        createAssociatedTokenAccountIdempotentInstruction(walletPk, userAta, walletPk, mint),
        createAssociatedTokenAccountIdempotentInstruction(walletPk, userUsdcAta, walletPk, usdcMint),
      );
      if (mint.equals(WRAPPED_SOL_MINT)) {
        const balInfo = await conn.getTokenAccountBalance(userAta).catch(() => ({ value: { amount: "0" } }));
        if (parseInt(balInfo.value.amount) < rawDeposit + 5_000_000) {
          setupTx.add(SystemProgram.transfer({ fromPubkey: walletPk, toPubkey: userAta, lamports: rawDeposit + 5_000_000 }));
          setupTx.add(createSyncNativeInstruction(userAta));
        }
      }
      if (setupTx.instructions.length > 4) {
        const sig = await sendTransaction(setupTx, conn);
        await conn.confirmTransaction(sig);
      }

      const depositIx = await (program as any).methods
        .depositCollateral(new BN(rawDeposit))
        .accountsStrict({
          protocolState: psPda,
          vault: vPda,
          userCollateral: cPda,
          userAccount: uaPda,
          vaultAta,
          userAta,
          assetMint: mint,
          authority: walletPk,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .instruction();

      const borrowIx = await (program as any).methods
        .borrowAsset(new BN(rawBorrow))
        .accountsStrict({
          protocolState: psPda,
          vault: usdcVPda,
          userAccount: uaPda,
          borrowPosition: bPda,
          vaultAta: usdcVA,
          userAta: userUsdcAta,
          borrowMint: usdcMint,
          collateralPriceFeed: PublicKey.default,
          borrowPriceFeed: PublicKey.default,
          authority: walletPk,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .instruction();

      const tx2 = new Transaction();
      tx2.add(depositIx, borrowIx);
      const sig2 = await sendTransaction(tx2, conn);
      await conn.confirmTransaction(sig2);

      toast.success(`Deposited + borrowed ${borrowAmount} ${selectedFiat}`, { id: tid });
      setDepositAmount("");
      setBorrowAmount("");
    } catch (e: any) {
      const logs = (e as any)?.logs;
      const err = logs?.find((l: string) => l.includes("Error Code:")) || e.message || String(e);
      toast.error(err.length > 120 ? err.slice(0, 120) + "..." : err, { id: tid });
    } finally { setTxPending(false); }
  }, [ready, program, walletPk, signTransaction, sendTransaction, selectedAsset, depositNum, depositAmount, borrowAmount, borrowUsd, selectedFiat]);

  const collateralAssets = SUPPORTED_ASSETS.filter((a) => a.ltv > 0);
  const hasBalances = collateralAssets.some((a) => (balances[a.symbol] ?? 0) > 0);
  const filteredAssets = collateralAssets.filter((a) => (balances[a.symbol] ?? 0) > 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Borrow</h1>
        <p className="text-surface-400 mt-1">Deposit collateral and borrow local fiat currency</p>
      </div>

      {!connected ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <svg className="w-16 h-16 text-surface-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="text-xl font-semibold text-white mb-2">Connect your wallet</h2>
          <p className="text-surface-400 mb-6 max-w-md">You need to connect a Solana wallet to borrow.</p>
          <button onClick={() => setVisible(true)} className="px-6 py-3 rounded-xl bg-liilend-500 hover:bg-liilend-600 text-white font-semibold">Connect Wallet</button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left column — Deposit */}
          <div className="lg:col-span-3 space-y-6">
            {/* Collateral asset selector */}
            <div className="p-6 rounded-2xl bg-surface-900/50 border border-surface-800">
              <h2 className="text-lg font-semibold text-white mb-4">Collateral Asset</h2>
              {!hasBalances ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <svg className="w-12 h-12 text-surface-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-surface-400 text-sm mb-1">No collateral assets found</p>
                  <p className="text-surface-500 text-xs max-w-xs">Deposit SOL, USDC, or other supported tokens into your wallet.</p>
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin">
                  {filteredAssets.map((asset) => (
                    <div key={asset.symbol} className="snap-start shrink-0 w-64">
                      <AssetCard
                        asset={asset}
                        price={MOCK_PRICES[asset.symbol] || 0}
                        selected={selectedAsset?.symbol === asset.symbol}
                        balance={balances[asset.symbol]}
                        onSelect={setSelectedAsset}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Deposit — only when an asset is selected */}
            {selectedAsset && (
              <div className="p-6 rounded-2xl bg-surface-900/50 border border-surface-800">
                <h2 className="text-lg font-semibold text-white mb-4">Deposit {selectedAsset.symbol}</h2>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-surface-500">Balance: {(balances[selectedAsset.symbol] ?? 0).toFixed(4)} {selectedAsset.symbol}</span>
                  {currentCollateralUsd > 0 && (
                    <span className="text-xs text-surface-500">Already deposited: ~${currentCollateralUsd.toFixed(2)}</span>
                  )}
                </div>
                <div className="relative">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-800 border border-surface-700 focus-within:border-liilend-500/40 transition-colors">
                    <img src={selectedAsset.logo} alt={selectedAsset.symbol} className="w-8 h-8 rounded-full" />
                    <input
                      type="number"
                      placeholder="0.00"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="flex-1 bg-transparent text-2xl font-mono text-white outline-none placeholder:text-surface-600"
                    />
                    <span className="text-surface-400 font-medium">{selectedAsset.symbol}</span>
                    <button
                      onClick={() => setDepositAmount(String(balances[selectedAsset.symbol] ?? 0))}
                      className="px-3 py-1.5 rounded-lg bg-liilend-500/10 hover:bg-liilend-500/20 text-liilend-400 text-xs font-semibold transition-colors"
                    >
                      MAX
                    </button>
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-surface-500">
                    <span>~${depositUsd.toFixed(2)} USD</span>
                    <span>Max borrow from this deposit: ~${(depositUsd * effectiveLtv).toFixed(2)}</span>
                  </div>
                </div>
                <button
                  onClick={handleDeposit}
                  disabled={!canDeposit || txPending}
                  className="w-full mt-4 py-3 rounded-xl bg-surface-700 hover:bg-surface-600 disabled:bg-surface-800 disabled:text-surface-500 text-white font-semibold text-sm transition-all"
                >
                  {txPending ? "Processing..." : `Deposit ${selectedAsset.symbol}`}
                </button>
              </div>
            )}
          </div>

          {/* Right column — Health + Borrow */}
          <div className="lg:col-span-2">
            <div className="p-6 rounded-2xl bg-surface-900/80 border border-surface-800 sticky top-24 space-y-5">

              {/* Health Factor display */}
              <div className="text-center">
                <p className="text-xs text-surface-400 mb-1">Health Factor</p>
                <p className={`text-4xl font-bold ${
                  projectedHealth === null ? 'text-surface-500' :
                  projectedHealth >= 2.0 ? 'text-liilend-400' :
                  projectedHealth >= 1.5 ? 'text-orange-400' :
                  'text-red-400'
                }`}>
                  {projectedHealth === null ? '-' : projectedHealth.toFixed(2)}
                </p>
                <div className="flex justify-center gap-6 mt-3 text-sm">
                  <div>
                    <p className="text-surface-400 text-xs">Collateral</p>
                    <p className="text-white font-semibold">${totalCollateralUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className="text-surface-400 text-xs">Borrowed</p>
                    <p className="text-white font-semibold">${totalBorrowUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>

              {/* Borrow Power */}
              <div className="p-4 rounded-xl bg-surface-800/50 border border-surface-700/50">
                <p className="text-xs text-surface-400 mb-1">Available to borrow</p>
                <p className="text-xl font-bold text-white">
                  ${availableBorrowUsd > 0 ? availableBorrowUsd.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0.00"} USD
                </p>
                <p className="text-sm text-surface-400">
                  ≈ {availableBorrowFiat > 0 ? availableBorrowFiat.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0.00"} {selectedFiat}
                </p>
              </div>

              {/* Borrow form */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-white">Borrow</h3>

                {/* Fiat selector */}
                <div className="flex flex-wrap gap-1.5">
                  {SUPPORTED_FIAT_CURRENCIES.map((fiat) => (
                    <button key={fiat.code} onClick={() => setSelectedFiat(fiat.code)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedFiat === fiat.code
                          ? "bg-liilend-500/10 text-liilend-400 border border-liilend-500/20"
                          : "bg-surface-800 text-surface-400 border border-surface-700"
                      }`}>
                      {fiat.flag} {fiat.code}
                    </button>
                  ))}
                </div>

                {/* Borrow amount */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-800 border border-surface-700 focus-within:border-liilend-500/40 transition-colors">
                  <span className="text-2xl">{SUPPORTED_FIAT_CURRENCIES.find((f) => f.code === selectedFiat)?.flag ?? ""}</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={borrowAmount}
                    onChange={(e) => setBorrowAmount(e.target.value)}
                    className="flex-1 bg-transparent text-2xl font-mono text-white outline-none placeholder:text-surface-600"
                  />
                  <span className="text-surface-400 font-medium">{selectedFiat}</span>
                </div>
                <div className="flex justify-between text-xs text-surface-500">
                  <span>~{borrowUsd.toFixed(2)} USD</span>
                  <span>Max: {availableBorrowFiat.toFixed(2)} {selectedFiat}</span>
                </div>

                {/* Fiat destination */}
                <div className="pt-3 border-t border-surface-800">
                  <p className="text-xs text-surface-400 mb-2">Receive funds via</p>
                  <div className="flex gap-2 mb-3">
                    <button onClick={() => { setFiatDestType("mobile"); setFiatDestValue(""); }}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                        fiatDestType === "mobile"
                          ? "bg-liilend-500/10 text-liilend-400 border border-liilend-500/20"
                          : "bg-surface-800 text-surface-400 border border-surface-700"
                      }`}>
                      📱 Mobile Money
                    </button>
                    <button onClick={() => { setFiatDestType("bank"); setFiatDestValue(""); }}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                        fiatDestType === "bank"
                          ? "bg-liilend-500/10 text-liilend-400 border border-liilend-500/20"
                          : "bg-surface-800 text-surface-400 border border-surface-700"
                      }`}>
                      🏦 Bank Account
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder={fiatDestType === "mobile" ? "Phone number (e.g. +2547XXXXXXXX)" : "Bank account number"}
                    value={fiatDestValue}
                    onChange={(e) => setFiatDestValue(e.target.value)}
                    className="w-full p-3 rounded-xl bg-surface-800 border border-surface-700 text-white text-sm outline-none focus:border-liilend-500/40 placeholder:text-surface-600"
                  />
                </div>

                {/* Borrow button */}
                <button
                  onClick={() => {
                    if (depositNum > 0 && selectedAsset) {
                      handleDepositAndBorrow();
                    } else {
                      handleBorrow();
                    }
                  }}
                  disabled={!canBorrow || txPending}
                  className="w-full py-3.5 rounded-xl bg-liilend-500 hover:bg-liilend-600 disabled:bg-surface-700 disabled:text-surface-500 text-white font-semibold text-sm transition-all"
                >
                  {txPending ? "Processing..." : !canBorrow
                    ? borrowUsd > availableBorrowUsd
                      ? "Exceeds available"
                      : !needsDestInfo
                        ? "Enter destination"
                        : "Enter borrow amount"
                    : depositNum > 0 && selectedAsset
                      ? `Deposit & Borrow ${borrowAmount} ${selectedFiat}`
                      : `Borrow ${borrowAmount} ${selectedFiat}`}
                </button>

                {borrowNum > 0 && borrowUsd > availableBorrowUsd && (
                  <p className="text-[10px] text-red-400">Borrow amount exceeds your available borrowing power. Deposit more collateral or reduce the amount.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
