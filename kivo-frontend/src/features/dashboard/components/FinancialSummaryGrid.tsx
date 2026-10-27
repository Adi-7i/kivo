import * as React from "react";
import { FinancialSummaryCard } from "@/features/shared-financial/FinancialSummaryCard";
import { FinancialSummaryCardSkeleton } from "@/features/shared-financial/FinancialSkeleton";
import { DashboardHeroCards } from "./DashboardHeroCards";
import type { FinancialSummaryMetrics } from "../types";
import {
  TrendingDown,
  CalendarDays,
  ArrowDownLeft,
  HandCoins,
  Receipt,
  Lock,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface FinancialSummaryGridProps {
  metrics: FinancialSummaryMetrics;
  isLoading?: boolean;
}

export function FinancialSummaryGrid({ metrics, isLoading = false }: FinancialSummaryGridProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Hero Card Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-48" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <FinancialSummaryCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1 & 2: Primary Financial Positions (Hero Cards) */}
      <DashboardHeroCards
        liquidBalancePaise={metrics.liquidBalancePaise}
        safeToSpendPaise={metrics.safeToSpendPaise}
      />

      {/* Secondary Metrics Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Cash Flow &amp; Obligations
        </h2>
        <span className="text-[11px] font-medium text-muted-foreground/80">
          Total Balance &ne; Safe-to-Spend
        </span>
      </div>

      {/* 3 to 8: Secondary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* 3. Today's Expenses */}
        <FinancialSummaryCard
          title="Today's Expenses"
          amountPaise={metrics.todayExpensePaise}
          subtitle="Expenditures on current calendar date"
          icon={<TrendingDown className="size-4 text-finance-expense" />}
          variant="expense"
          className="card-hover-interactive"
        />

        {/* 4. Monthly Expenses */}
        <FinancialSummaryCard
          title="Monthly Expenses"
          amountPaise={metrics.monthExpensePaise}
          subtitle="Total personal expenses this month"
          icon={<CalendarDays className="size-4 text-finance-expense" />}
          variant="expense"
          className="card-hover-interactive"
        />

        {/* 5. Money Received */}
        <FinancialSummaryCard
          title="Money Received"
          amountPaise={metrics.monthReceivedPaise}
          subtitle="External income this month; excludes loans"
          icon={<ArrowDownLeft className="size-4 text-finance-income" />}
          variant="income"
          className="card-hover-interactive"
        />

        {/* 6. Money Owed to User */}
        <FinancialSummaryCard
          title="Owed to You (Asset)"
          amountPaise={metrics.moneyOwedToUserPaise}
          subtitle="Outstanding receivables &amp; shared advances"
          icon={<HandCoins className="size-4 text-blue-600 dark:text-blue-400" />}
          variant="default"
          className="card-hover-interactive"
        />

        {/* 7. Money Owed by User */}
        <FinancialSummaryCard
          title="Owed by You (Liability)"
          amountPaise={metrics.moneyOwedByUserPaise}
          subtitle="Payables from borrowed funds"
          icon={<Receipt className="size-4 text-orange-600 dark:text-orange-400" />}
          variant="liability"
          className="card-hover-interactive"
        />

        {/* 8. Reserved Funds */}
        <FinancialSummaryCard
          title="Reserved Obligations"
          amountPaise={metrics.reservedFundsPaise}
          subtitle="Earmarked for upcoming fixed expenses"
          icon={<Lock className="size-4 text-amber-600 dark:text-amber-400" />}
          variant="reserved"
          className="card-hover-interactive"
        />
      </div>
    </div>
  );
}

