"use client";

interface HealthFactorMeterProps {
  healthFactor: number;
  size?: "sm" | "md" | "lg";
  showCenterLabel?: boolean;
}

function getHealthColor(hf: number): string {
  if (hf <= 1.0) return "bg-red-500";
  if (hf <= 1.2) return "bg-orange-500";
  if (hf <= 1.5) return "bg-yellow-500";
  if (hf <= 2.0) return "bg-liilend-400";
  return "bg-liilend-500";
}

function getHealthLabel(hf: number): { text: string; color: string } {
  if (hf <= 1.0) return { text: "Liquidation Risk", color: "text-red-400" };
  if (hf <= 1.2) return { text: "Danger Zone", color: "text-orange-400" };
  if (hf <= 1.5) return { text: "Caution", color: "text-yellow-400" };
  if (hf <= 2.0) return { text: "Healthy", color: "text-liilend-400" };
  return { text: "Very Safe", color: "text-liilend-500" };
}

export function HealthFactorMeter({
  healthFactor,
  size = "md",
  showCenterLabel,
}: HealthFactorMeterProps) {
  const clampedHf = Math.min(Math.max(healthFactor, 0), 3.0);
  const percentage = (clampedHf / 3.0) * 100;
  const label = getHealthLabel(healthFactor);
  const barColor = getHealthColor(healthFactor);

  const height = size === "sm" ? "h-1.5" : size === "lg" ? "h-3" : "h-2";
  const textSize = size === "sm" ? "text-xs" : size === "lg" ? "text-lg" : "text-sm";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className={`font-semibold ${textSize} text-white`}>
          {healthFactor.toFixed(2)}
        </span>
        <span className={`text-xs font-medium ${label.color}`}>
          {label.text}
        </span>
      </div>
      <div className={`relative w-full ${height} rounded-full bg-surface-700 overflow-hidden`}>
        <div
          className={`${height} rounded-full ${barColor} transition-all duration-700 ease-out`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
        {showCenterLabel && (
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold text-white drop-shadow-md">
            1.5
          </span>
        )}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-red-400">0</span>
        <span className="text-[10px] text-yellow-400">1.0</span>
        {showCenterLabel && <span className="text-[10px] text-liilend-400 font-semibold">1.5</span>}
        <span className="text-[10px] text-liilend-500">3.0</span>
      </div>
    </div>
  );
}
