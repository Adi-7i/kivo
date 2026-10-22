import * as React from "react";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { ClaimStatusBadge } from "./ClaimStatusBadge";
import { Button } from "@/components/ui/button";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { ClaimEntity } from "../types";

interface ClaimCardProps {
  claim: ClaimEntity;
  onSettle?: (claim: ClaimEntity) => void;
}

export function ClaimCard({ claim, onSettle }: ClaimCardProps) {
  const isReceivable = claim.direction === "receivable";
  const settledPaise = claim.principalPaise - claim.outstandingPaise;
  const progressPercent =
    claim.principalPaise > 0
      ? Math.min(100, Math.round((settledPaise / claim.principalPaise) * 100))
      : 100;

  return (
    <div className="rounded-xl border border-border/80 bg-card p-4 hover:border-kivo-sage/70 transition-all duration-200 space-y-3">
      {/* Header: Title + Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground truncate">{claim.title}</span>
            <ClaimStatusBadge status={claim.status} />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {isReceivable ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                <ArrowDownLeft className="size-3 text-emerald-600" />
                Receivable from {claim.contactName}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-800 dark:text-amber-400 font-medium">
                <ArrowUpRight className="size-3 text-amber-700" />
                Payable to {claim.contactName}
              </span>
            )}
            <span>&bull;</span>
            <span className="font-mono text-[11px]">{claim.effectiveDate}</span>
          </div>
        </div>

        {onSettle && claim.outstandingPaise > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSettle(claim)}
            className="text-xs h-7 px-2.5 shrink-0"
          >
            {isReceivable ? "Record Repayment" : "Pay Back"}
          </Button>
        )}
      </div>

      {/* Amounts and Progress Bar */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {isReceivable ? "Recovered:" : "Repaid:"}{" "}
            <MoneyAmount paise={settledPaise} size="xs" variant="neutral" /> of{" "}
            <MoneyAmount paise={claim.principalPaise} size="xs" />
          </span>

          <div className="font-semibold text-xs flex items-center gap-1">
            <span className="text-muted-foreground">Outstanding:</span>
            <MoneyAmount
              paise={claim.outstandingPaise}
              size="sm"
              variant={isReceivable ? "income" : "reserved"}
            />
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Claim recovery progress: ${progressPercent}%`}
          className="h-1.5 w-full rounded-full bg-muted overflow-hidden"
        >
          <div
            className={`h-full transition-all duration-300 ${
              isReceivable ? "bg-emerald-600" : "bg-amber-600"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {claim.notes && (
        <p className="text-xs text-muted-foreground/80 italic border-t border-border/40 pt-2">
          {claim.notes}
        </p>
      )}
    </div>
  );
}
