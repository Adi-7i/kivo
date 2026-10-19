import * as React from "react";
import { FinancialSummaryCard } from "@/features/shared-financial/FinancialSummaryCard";
import { FinancialSummaryCardSkeleton } from "@/features/shared-financial/FinancialSkeleton";
import type { FinancialSummaryMetrics } from "../types";
import {
  Wallet,
  ShieldCheck,
  TrendingDown,
  CalendarDays,
  ArrowDownLeft,
  HandCoins,
  Receipt,
  Lock,
} from "lucide-react";

interface FinancialSummaryGridProps {
  metrics: FinancialSummaryMetrics;
  isLoading?: boolean;
}

export function FinancialSummaryGrid({ metrics, isLoading = false }: FinancialSummaryGridProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Financial Position Summary
          </h2>
          <span className="text-[11px] text-muted-foreground">
            Total Balance &ne; Safe-to-Spend
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <FinancialSummaryCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Financial Position Summary
        </h2>
        <span className="text-[11px] text-muted-foreground">Total Balance &ne; Safe-to-Spend</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Total Liquid Balance */}
        <FinancialSummaryCard
          title="Total Liquid Balance"
          amountPaise={metrics.liquidBalancePaise}
          subtitle="All active cash, bank & wallet balances"
          icon={<Wallet className="size-4" />}
          variant="default"
        />

        {/* 2. Safe-to-Spend */}
        <FinancialSummaryCard
          title="Safe-to-Spend"
          amountPaise={metrics.safeToSpendPaise}
          subtitle="Liquid funds minus reserved obligations"
          icon={<ShieldCheck className="size-4 text-kivo-primary" />}
          variant="safe-to-spend"
        />

        {/* 3. Today's Expenses */}
        <FinancialSummaryCard
          title="Today's Expenses"
          amountPaise={metrics.todayExpensePaise}
          subtitle="Expenditures on current calendar date"
          icon={<TrendingDown className="size-4 text-finance-expense" />}
          variant="expense"
        />

        {/* 4. Monthly Expenses */}
        <FinancialSummaryCard
          title="Monthly Expenses"
          amountPaise={metrics.monthExpensePaise}
          subtitle="Total personal expenses this month"
          icon={<CalendarDays className="size-4 text-finance-expense" />}
          variant="expense"
        />

        {/* 5. Money Received */}
        <FinancialSummaryCard
          title="Money Received"
          amountPaise={metrics.monthReceivedPaise}
          subtitle="Income & external inflows this month"
          icon={<ArrowDownLeft className="size-4 text-finance-income" />}
          variant="income"
        />

        {/* 6. Money Owed to User */}
        <FinancialSummaryCard
          title="Owed to You (Asset)"
          amountPaise={metrics.moneyOwedToUserPaise}
          subtitle="Receivables from loans given to friends"
          icon={<HandCoins className="size-4 text-blue-600" />}
          variant="default"
        />

        {/* 7. Money Owed by User */}
        <FinancialSummaryCard
          title="Owed by You (Liability)"
          amountPaise={metrics.moneyOwedByUserPaise}
          subtitle="Payables from borrowed funds"
          icon={<Receipt className="size-4 text-orange-600" />}
          variant="liability"
        />

        {/* 8. Reserved Funds */}
        <FinancialSummaryCard
          title="Reserved Obligations"
          amountPaise={metrics.reservedFundsPaise}
          subtitle="Earmarked for upcoming fixed expenses"
          icon={<Lock className="size-4 text-amber-600" />}
          variant="reserved"
        />
      </div>
    </div>
  );
}
