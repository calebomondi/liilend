"use client";

import { AssetConfig } from "@/types";

interface AssetCardProps {
  asset: AssetConfig;
  price: number;
  selected?: boolean;
  balance?: number;
  onSelect?: (asset: AssetConfig) => void;
}

export function AssetCard({
  asset,
  price,
  selected,
  balance,
  onSelect,
}: AssetCardProps) {
  return (
    <button
      onClick={() => onSelect?.(asset)}
      className={`w-full p-4 rounded-xl border transition-all duration-200 text-left ${
        selected
          ? "border-liilend-500 bg-liilend-500/10 shadow-lg shadow-liilend-500/10"
          : "border-surface-700 bg-surface-800/50 hover:border-surface-600 hover:bg-surface-800"
      }`}
    >
      <div className="flex items-center gap-3">
        <img
          src={asset.logo}
          alt={asset.symbol}
          className="w-10 h-10 rounded-full"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white">{asset.symbol}</span>
            <span className="text-sm text-surface-300">
              ${price.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-xs text-surface-400 truncate">
              {asset.name}
            </span>
            {balance !== undefined && (
              <span className="text-xs text-surface-400">
                {balance.toFixed(4)}
              </span>
            )}
          </div>
        </div>
        {selected && (
          <div className="w-5 h-5 rounded-full bg-liilend-500 flex items-center justify-center">
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
        <div className="bg-surface-900/50 rounded-lg p-2 text-center">
          <span className="text-surface-500">Max LTV</span>
          <p className="text-surface-300 font-medium">
            {(asset.ltv * 100).toFixed(0)}%
          </p>
        </div>
        <div className="bg-surface-900/50 rounded-lg p-2 text-center">
          <span className="text-surface-500">Liquidation</span>
          <p className="text-surface-300 font-medium">
            {(asset.liquidationThreshold * 100).toFixed(0)}%
          </p>
        </div>
        <div className="bg-surface-900/50 rounded-lg p-2 text-center">
          <span className="text-surface-500">Penalty</span>
          <p className="text-red-400 font-medium">
            {(asset.liquidationPenalty * 100).toFixed(0)}%
          </p>
        </div>
      </div>
    </button>
  );
}
