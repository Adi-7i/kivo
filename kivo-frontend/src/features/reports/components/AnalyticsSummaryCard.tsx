import * as React from "react";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { TrendingDown, TrendingUp, Scale, Calendar, Zap, Receipt } from "lucide-react";
import type { AnalyticsSummary } from "../types";

interface AnalyticsSummaryCardProps {
  summary: AnalyticsSummary;
  className?: string;
}

export function AnalyticsSummaryCard({ summary, className }: AnalyticsSummaryCardProps) {
  return (
    <div className={`space-y-3 ${className || ""}`}>
      {/* 6 Metric KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Total Personal Expenses */}
        <div className="rounded-xl border border-destructive/20 bg-card p-3.5 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase font-semibold tracking-wider">
              Personal Expenses
            </span>
            <TrendingDown className="size-3.5 text-destructive" />
          </div>
          <MoneyAmount paise={summary.totalExpensesPaise} size="xl" variant="expense" />
          <p className="text-[10px] text-muted-foreground truncate">Excludes loans & transfers</p>
        </div>

        {/* 2. Eligible Money Inflow */}
        <div className="rounded-xl border border-emerald-500/20 bg-card p-3.5 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase font-semibold tracking-wider">
              Eligible Inflows
            </span>
            <TrendingUp className="size-3.5 text-emerald-600" />
          </div>
          <MoneyAmount paise={summary.eligibleIncomePaise} size="xl" variant="income" />
          <p className="text-[10px] text-muted-foreground truncate">Salary & earned funds</p>
        </div>

        {/* 3. Net Cash Flow */}
        <div className="rounded-xl border border-kivo-primary/20 bg-card p-3.5 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase font-semibold tracking-wider">
              Net Cash Flow
            </span>
            <Scale className="size-3.5 text-kivo-primary" />
          </div>
          <MoneyAmount
            paise={summary.netCashFlowPaise}
            size="xl"
            variant={summary.netCashFlowPaise >= 0 ? "income" : "expense"}
            showSign
          />
          <p className="text-[10px] text-muted-foreground truncate">Inflow minus expense</p>
        </div>

        {/* 4. Average Daily Spending */}
        <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase font-semibold tracking-wider">
              Daily Average
            </span>
            <Calendar className="size-3.5 text-muted-foreground" />
          </div>
          <MoneyAmount paise={summary.avgDailySpendingPaise} size="xl" variant="default" />
          <p className="text-[10px] text-muted-foreground truncate">Average per day in cycle</p>
        </div>

        {/* 5. Highest Spending Day */}
        <div className="rounded-xl border border-amber-500/20 bg-card p-3.5 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase font-semibold tracking-wider">
              Peak Spending Day
            </span>
            <Zap className="size-3.5 text-amber-600" />
          </div>
          <MoneyAmount paise={summary.highestSpendingDay.amountPaise} size="xl" variant="expense" />
          <p className="text-[10px] text-muted-foreground truncate">
            {summary.highestSpendingDay.date}
          </p>
        </div>

        {/* 6. Transaction Count */}
        <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase font-semibold tracking-wider">
              Total Transactions
            </span>
            <Receipt className="size-3.5 text-muted-foreground" />
          </div>
          <div className="font-heading font-bold text-xl sm:text-2xl text-foreground">
            {summary.transactionCount}
          </div>
          <p className="text-[10px] text-muted-foreground truncate">Recorded activities</p>
        </div>
      </div>
    </div>
  );
}
