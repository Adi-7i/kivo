import * as React from "react";
import { cn } from "@/lib/utils";

interface FundingProgressIndicatorProps {
  originalAmountPaise: number;
  spentPaise: number;
  lentPaise: number;
  remainingPaise: number;
  className?: string;
  showLabels?: boolean;
}

export function FundingProgressIndicator({
  originalAmountPaise,
  spentPaise,
  lentPaise,
  remainingPaise,
  className,
  showLabels = false,
}: FundingProgressIndicatorProps) {
  const safeTotal = Math.max(1, originalAmountPaise);

  const spentPct = Math.min(100, Math.round((spentPaise / safeTotal) * 100));
  const lentPct = Math.min(100 - spentPct, Math.round((lentPaise / safeTotal) * 100));
  const remainingPct = Math.min(
    100 - spentPct - lentPct,
    Math.round((remainingPaise / safeTotal) * 100)
  );

  return (
    <div className={cn("space-y-1.5 w-full", className)}>
      <div
        className="h-2 w-full rounded-full bg-muted overflow-hidden flex"
        role="progressbar"
        aria-valuenow={spentPct + lentPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Fund allocation: ${spentPct}% spent, ${lentPct}% lent, ${remainingPct}% remaining`}
      >
        {spentPct > 0 && (
          <div
            style={{ width: `${spentPct}%` }}
            className="h-full bg-kivo-primary transition-all duration-300"
            title={`Personal Spent: ${spentPct}%`}
          />
        )}
        {lentPct > 0 && (
          <div
            style={{ width: `${lentPct}%` }}
            className="h-full bg-blue-600 transition-all duration-300"
            title={`Lent to Friends (Asset): ${lentPct}%`}
          />
        )}
        {remainingPct > 0 && (
          <div
            style={{ width: `${remainingPct}%` }}
            className="h-full bg-kivo-sage/40 transition-all duration-300"
            title={`Remaining Liquid Allocation: ${remainingPct}%`}
          />
        )}
      </div>

      {showLabels && (
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-kivo-primary inline-block" />
            <span>Spent ({spentPct}%)</span>
          </div>
          {lentPct > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-blue-600 inline-block" />
              <span>Lent Asset ({lentPct}%)</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-kivo-sage/60 inline-block" />
            <span>Remaining ({remainingPct}%)</span>
          </div>
        </div>
      )}
    </div>
  );
}
