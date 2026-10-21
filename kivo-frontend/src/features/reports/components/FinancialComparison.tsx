import * as React from "react";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { ArrowDownRight, ArrowUpRight, Minus, ArrowRightLeft } from "lucide-react";
import type { PeriodComparison } from "../types";

interface FinancialComparisonProps {
  comparison: PeriodComparison;
  className?: string;
}

export function FinancialComparison({ comparison, className }: FinancialComparisonProps) {
  const isSpendingReduced = comparison.changePaise < 0;
  const isSpendingIncreased = comparison.changePaise > 0;
  const absChangePaise = Math.abs(comparison.changePaise);

  return (
    <div
      className={`rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4 ${className || ""}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-kivo-primary/10 text-kivo-primary flex items-center justify-center">
              <ArrowRightLeft className="size-4" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-foreground tracking-tight">
                Cycle-over-Cycle Comparison
              </h3>
              <p className="text-xs text-muted-foreground">
                Expenditure trajectory comparing {comparison.currentPeriodLabel} against{" "}
                {comparison.previousPeriodLabel}
              </p>
            </div>
          </div>
        </div>

        {/* Status Chip */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold self-start sm:self-auto ${
            isSpendingReduced
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
              : isSpendingIncreased
                ? "bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900"
                : "bg-muted text-muted-foreground border border-border"
          }`}
        >
          {isSpendingReduced ? (
            <>
              <ArrowDownRight className="size-3.5 text-emerald-600" />
              <span>Spending Reduced</span>
            </>
          ) : isSpendingIncreased ? (
            <>
              <ArrowUpRight className="size-3.5 text-amber-600" />
              <span>Spending Increased</span>
            </>
          ) : (
            <>
              <Minus className="size-3.5" />
              <span>Spending Unchanged</span>
            </>
          )}
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        {/* Previous Period */}
        <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-1">
          <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
            {comparison.previousPeriodLabel}
          </span>
          <MoneyAmount paise={comparison.previousExpensePaise} size="xl" variant="default" />
          <p className="text-[10px] text-muted-foreground">Baseline expenditure</p>
        </div>

        {/* Current Period */}
        <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-1">
          <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
            {comparison.currentPeriodLabel}
          </span>
          <MoneyAmount paise={comparison.currentExpensePaise} size="xl" variant="expense" />
          <p className="text-[10px] text-muted-foreground">Active cycle personal expenses</p>
        </div>

        {/* Net Variance */}
        <div
          className={`rounded-xl border p-3.5 space-y-1 ${
            isSpendingReduced
              ? "border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-900"
              : isSpendingIncreased
                ? "border-amber-200 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900"
                : "border-border bg-card"
          }`}
        >
          <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
            Spending Variance
          </span>
          <div className="flex items-baseline gap-2">
            <MoneyAmount
              paise={absChangePaise}
              size="xl"
              variant={isSpendingReduced ? "income" : "expense"}
            />
            {comparison.changePercent !== null && (
              <span
                className={`font-mono text-xs font-semibold ${
                  isSpendingReduced
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-amber-700 dark:text-amber-400"
                }`}
              >
                ({comparison.changePercent > 0 ? "+" : ""}
                {comparison.changePercent}%)
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            {isSpendingReduced
              ? "Saved compared to previous cycle"
              : isSpendingIncreased
                ? "Additional spending compared to previous cycle"
                : "Identical to previous cycle"}
          </p>
        </div>
      </div>
    </div>
  );
}
