import * as React from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Archive, Clock, AlertTriangle } from "lucide-react";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { formatDateDisplay } from "@/lib/formatters/date";
import type { MoneySourceEntity } from "../types";

interface ExhaustionBannerProps {
  source: MoneySourceEntity;
  className?: string;
}

export function ExhaustionBanner({ source, className }: ExhaustionBannerProps) {
  if (source.status === "exhausted") {
    return (
      <Alert
        className={`border-neutral-300 bg-neutral-50/80 dark:border-neutral-800 dark:bg-neutral-900/40 text-foreground ${className ?? ""}`}
      >
        <Archive className="size-4 text-neutral-600 dark:text-neutral-400 mt-0.5" />
        <div className="space-y-1">
          <AlertTitle className="text-xs font-bold text-foreground flex items-center gap-2">
            <span>Funding Batch Fully Exhausted</span>
            {source.durationDays && (
              <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                Lasted {source.durationDays} calendar days
              </span>
            )}
          </AlertTitle>
          <AlertDescription className="text-xs text-muted-foreground leading-relaxed">
            All 100% of this inflow has been fully attributed across expenditures and loans as of{" "}
            <strong>
              {source.exhaustionDate ? formatDateDisplay(source.exhaustionDate) : "recent date"}
            </strong>
            .
            <span className="block mt-1 text-[11px] text-muted-foreground/80">
              Note: Attribution exhaustion is an accounting FIFO metric, not necessarily a zero bank
              balance.
            </span>
          </AlertDescription>
        </div>
      </Alert>
    );
  }

  if (source.status === "unresolved") {
    return (
      <Alert className={`border-orange-500/30 bg-orange-500/10 text-foreground ${className ?? ""}`}>
        <AlertTriangle className="size-4 text-orange-600 dark:text-orange-400 mt-0.5" />
        <div className="space-y-1">
          <AlertTitle className="text-xs font-bold text-orange-950 dark:text-orange-200">
            Attribution Recalculation Pending
          </AlertTitle>
          <AlertDescription className="text-xs text-muted-foreground leading-relaxed">
            This funding source is currently undergoing backend reconciliation or audit. Historical
            attribution totals will refresh once authoritative Django calculations complete.
          </AlertDescription>
        </div>
      </Alert>
    );
  }

  return (
    <Alert className={`border-emerald-600/25 bg-emerald-500/5 text-foreground ${className ?? ""}`}>
      <Clock className="size-4 text-emerald-600 dark:text-emerald-400 mt-0.5" />
      <div className="space-y-1">
        <AlertTitle className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
          <span>Active Allocation Inflow</span>
          <span className="text-[11px] font-normal text-muted-foreground">
            Remaining unallocated:
          </span>
          <MoneyAmount
            paise={source.remainingPaise}
            size="xs"
            tabular
            className="font-semibold text-kivo-primary"
          />
        </AlertTitle>
        <AlertDescription className="text-xs text-muted-foreground leading-relaxed">
          Future personal expenses and friend loans will be attributed against this batch in FIFO
          chronological order.
        </AlertDescription>
      </div>
    </Alert>
  );
}
