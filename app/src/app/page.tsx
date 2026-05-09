"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { SUPPORTED_ASSETS, MOCK_PRICES, RPC_ENDPOINT } from "@/utils/constants";
import { deriveProtocolStatePDA } from "@/lib/protocol";
import { LIILEND_IDL } from "@/lib/idl";

function toBigInt(val: any): bigint {
  if (val == null) return 0n;
  if (typeof val === "bigint") return val;
  if (val.toString) return BigInt(val.toString());
  return BigInt(val);
}

const FEATURES = [
  {
    title: "Crypto-Backed Loans",
    description: "Use SOL, USDC, or LSTs as collateral to borrow local fiat currencies.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "Multi-Currency Support",
    description: "Borrow in KES, NGN, GHS, ZAR, or USD — sent directly to your mobile money or bank.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
      </svg>
    ),
  },
  {
    title: "Over-Collateralized Safety",
    description: "Your loans are always backed by more value than borrowed. Monitor your health factor in real-time.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: "No KYC Required",
    description: "Connect your Solana wallet and borrow instantly. No identity verification needed.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

export default function HomePage() {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();

  const [stats, setStats] = useState({ totalSupply: 0, activeLoans: 0, utilizationRate: 0, totalBorrowed: 0 });

  useEffect(() => {
    const conn = new Connection(RPC_ENDPOINT);
    const dummyWallet = { publicKey: PublicKey.default };
    const provider = new AnchorProvider(conn, dummyWallet as any, AnchorProvider.defaultOptions());
    const prog = new Program(LIILEND_IDL, provider);
    const acc = (prog as any).account;

    const fetchData = async () => {
      try {
        const [psPda] = deriveProtocolStatePDA();
        const ps = await acc.protocolState.fetch(psPda);

        const totalSupplyUsd = Number(toBigInt(ps.totalDepositsUsd)) / 1e6 || 0;
        const totalBorrowedUsd = Number(toBigInt(ps.totalBorrowsUsd)) / 1e6 || 0;

        let activeLoans = 0;
        try {
          const allBorrows = await acc.borrowPosition.all();
          activeLoans = allBorrows.length;
        } catch {}

        setStats({
          totalSupply: totalSupplyUsd,
          activeLoans,
          utilizationRate: totalBorrowedUsd > 0 && totalSupplyUsd > 0
            ? (totalBorrowedUsd / totalSupplyUsd) * 100
            : 0,
          totalBorrowed: totalBorrowedUsd,
        });
      } catch {}
    };
    fetchData();
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-surface-800">
        <div className="absolute inset-0 bg-gradient-to-b from-liilend-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-liilend-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-liilend-500/10 border border-liilend-500/20 text-liilend-400 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-liilend-400 animate-pulse" />
              Live on Solana Devnet
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Borrow local currency{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-liilend-400 to-emerald-300">
                against your crypto
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-surface-400 mb-10 max-w-2xl mx-auto">
              Deposit SOL, USDC, or LSTs as collateral and borrow KES, NGN, GHS,
              ZAR, or USD. No KYC. Instant settlement.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {connected ? (
                <Link href="/borrow" className="px-8 py-3.5 rounded-xl bg-liilend-500 hover:bg-liilend-600 text-white font-semibold text-base transition-all duration-200 shadow-xl shadow-liilend-500/25">Start Borrowing</Link>
              ) : (
                <button onClick={() => setVisible(true)} className="px-8 py-3.5 rounded-xl bg-liilend-500 hover:bg-liilend-600 text-white font-semibold text-base transition-all duration-200 shadow-xl shadow-liilend-500/25">Connect Wallet</button>
              )}
              <Link href="/portfolio" className="px-8 py-3.5 rounded-xl border border-surface-700 hover:border-surface-600 text-surface-300 hover:text-white font-semibold text-base transition-all duration-200">View Portfolio</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-surface-900/80 border border-surface-800 backdrop-blur-sm">
            <p className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-1">Total Supply</p>
            <p className="text-2xl font-bold text-white">${stats.totalSupply.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
          <div className="p-5 rounded-2xl bg-surface-900/80 border border-surface-800 backdrop-blur-sm">
            <p className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-1">Active Loans</p>
            <p className="text-2xl font-bold text-white">{stats.activeLoans}</p>
          </div>
          <div className="p-5 rounded-2xl bg-surface-900/80 border border-surface-800 backdrop-blur-sm">
            <p className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-1">Utilization Rate</p>
            <p className="text-2xl font-bold text-white">{stats.utilizationRate.toFixed(1)}%</p>
          </div>
          <div className="p-5 rounded-2xl bg-surface-900/80 border border-surface-800 backdrop-blur-sm">
            <p className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-1">Total Borrowed</p>
            <p className="text-2xl font-bold text-white">${stats.totalBorrowed.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
        </div>
      </section>

      {/* Supported Assets with TVL */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-2xl font-bold text-white mb-8">Supported Collateral</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {SUPPORTED_ASSETS.map((asset) => (
            <div key={asset.symbol} className="flex items-center gap-3 p-4 rounded-2xl bg-surface-900/50 border border-surface-800">
              <img src={asset.logo} alt={asset.symbol} className="w-9 h-9 rounded-full shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm">{asset.symbol}</p>
                <p className="text-[11px] text-surface-400 truncate">{asset.name}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm text-liilend-400 font-medium">${MOCK_PRICES[asset.symbol]}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">Why LiiLend?</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="p-6 rounded-2xl bg-surface-900/30 border border-surface-800/50 hover:border-surface-700 transition-all duration-200">
              <div className="w-10 h-10 rounded-xl bg-liilend-500/10 text-liilend-400 flex items-center justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-surface-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
