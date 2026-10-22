import * as React from "react";
import type { BudgetStatus } from "../types";

interface BudgetProgressProps {
  spentPaise: number;
  limitPaise: number;
  className?: string;
  showLabel?: boolean;
}

export function getBudgetStatus(spentPaise: number, limitPaise: number): BudgetStatus {
  if (limitPaise <= 0) return "normal";
  const ratio = spentPaise / limitPaise;
  if (ratio > 1) return "exceeded";
  if (ratio === 1) return "full";
  if (ratio >= 0.8) return "warning";
  return "normal";
}

export function BudgetProgress({
  spentPaise,
  limitPaise,
  className,
  showLabel = false,
}: BudgetProgressProps) {
  const percent =
    limitPaise > 0 ? Math.round((spentPaise / limitPaise) * 100) : spentPaise > 0 ? 100 : 0;
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const status = getBudgetStatus(spentPaise, limitPaise);

  const getBarColor = () => {
    switch (status) {
      case "exceeded":
        return "bg-destructive";
      case "full":
        return "bg-blue-600";
      case "warning":
        return "bg-amber-600";
      case "normal":
      default:
        return "bg-emerald-600";
    }
  };

  return (
    <div className={`space-y-1 ${className || ""}`}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Utilization</span>
          <span
            className={`font-mono font-medium ${
              status === "exceeded"
                ? "text-destructive font-semibold"
                : status === "warning"
                  ? "text-amber-800 dark:text-amber-400"
                  : "text-foreground"
            }`}
          >
            {percent}%
          </span>
        </div>
      )}

      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Budget utilization: ${percent}%`}
        className="h-2 w-full rounded-full bg-muted overflow-hidden"
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${getBarColor()}`}
          style={{ width: `${clampedPercent}%` }}
        />
      </div>
    </div>
  );
}
