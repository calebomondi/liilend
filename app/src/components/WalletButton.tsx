"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useCallback, useEffect, useState } from "react";

export function WalletButton() {
  const { wallet, publicKey, disconnect, connecting, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [copied, setCopied] = useState(false);

  const shortAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : "";

  const handleCopy = useCallback(async () => {
    if (!publicKey) return;
    await navigator.clipboard.writeText(publicKey.toBase58());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [publicKey]);

  if (!connected) {
    return (
      <button
        onClick={() => setVisible(true)}
        disabled={connecting}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-liilend-500 hover:bg-liilend-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition-all duration-200 shadow-lg shadow-liilend-500/20"
      >
        {connecting ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            Connect Wallet
          </>
        )}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {wallet?.adapter.icon && (
        <img
          src={wallet.adapter.icon}
          alt={wallet.adapter.name}
          className="w-5 h-5 rounded-full"
        />
      )}
      <div className="relative group">
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-800 border border-surface-700 hover:border-liilend-500/40 text-sm font-mono text-surface-200 transition-all duration-200"
        >
          <span className="w-2 h-2 rounded-full bg-liilend-400" />
          {shortAddress}
          {copied && (
            <span className="text-xs text-liilend-400 absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-800 px-2 py-1 rounded-lg border border-surface-700 whitespace-nowrap">
              Copied!
            </span>
          )}
        </button>
      </div>
      <button
        onClick={disconnect}
        className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-all duration-200"
      >
        Disconnect
      </button>
    </div>
  );
}
