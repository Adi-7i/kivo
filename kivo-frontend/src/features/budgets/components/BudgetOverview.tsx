import * as React from "react";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { BudgetProgress } from "./BudgetProgress";
import { BudgetStatusBadge } from "./BudgetStatusBadge";
import { Button } from "@/components/ui/button";
import { Target, AlertTriangle, PlusCircle, Info } from "lucide-react";
import type { BudgetEntity, BudgetSummary } from "../types";

interface BudgetOverviewProps {
  summary: BudgetSummary;
  overallBudget?: BudgetEntity;
  onSetBudget?: () => void;
}

export function BudgetOverview({ summary, overallBudget, onSetBudget }: BudgetOverviewProps) {
  const isOverBudget = summary.overallSpentPaise > summary.overallLimitPaise;
  const remainingPaise = Math.max(0, summary.overallLimitPaise - summary.overallSpentPaise);
  const overspendPaise = Math.max(0, summary.overallSpentPaise - summary.overallLimitPaise);

  return (
    <div className="rounded-2xl border border-kivo-primary/20 bg-linear-to-b from-kivo-primary/5 to-card p-5 sm:p-6 shadow-xs space-y-5">
      {/* Top Header: Title + Target Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-lg bg-kivo-primary/10 text-kivo-primary flex items-center justify-center shrink-0">
            <Target className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-heading font-bold text-foreground tracking-tight">
                Monthly Spending Budget
              </h2>
              <BudgetStatusBadge status={summary.status} />
            </div>
            <p className="text-xs text-muted-foreground">
              Overall monthly expenditure boundary and category limits for period {summary.period}
            </p>
          </div>
        </div>

        {onSetBudget && (
          <Button
            size="sm"
            onClick={onSetBudget}
            className="bg-kivo-primary hover:bg-kivo-brand-dark text-white gap-1.5 text-xs font-medium self-start sm:self-auto shrink-0"
          >
            <PlusCircle className="size-3.5" />
            <span>{overallBudget ? "Adjust Overall Budget" : "Set Monthly Budget"}</span>
          </Button>
        )}
      </div>

      {/* 3 Metric Cards Grid: Total Limit, Current Spent, Remaining/Overspend */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. Overall Budget Limit */}
        <div className="rounded-xl border border-border/80 bg-card p-4 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Overall Budget Limit
          </span>
          <MoneyAmount paise={summary.overallLimitPaise} size="2xl" variant="default" />
          <p className="text-[11px] text-muted-foreground">
            Planned spending ceiling across all expense categories
          </p>
        </div>

        {/* 2. Budget Spent */}
        <div className="rounded-xl border border-border/80 bg-card p-4 space-y-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Personal Spent
          </span>
          <MoneyAmount paise={summary.overallSpentPaise} size="2xl" variant="expense" />
          <p className="text-[11px] text-muted-foreground">
            Actual personal expenses recorded in this cycle
          </p>
        </div>

        {/* 3. Remaining or Overspend */}
        <div
          className={`rounded-xl border p-4 space-y-1 ${
            isOverBudget
              ? "border-destructive/40 bg-destructive/5 dark:bg-destructive/10"
              : "border-emerald-200/80 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900/60"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-semibold uppercase tracking-wider block ${
                isOverBudget ? "text-destructive" : "text-emerald-800 dark:text-emerald-300"
              }`}
            >
              {isOverBudget ? "Budget Overspend" : "Budget Remaining"}
            </span>
            {isOverBudget && <AlertTriangle className="size-4 text-destructive" />}
          </div>
          <MoneyAmount
            paise={isOverBudget ? overspendPaise : remainingPaise}
            size="2xl"
            variant={isOverBudget ? "expense" : "income"}
            showSign={isOverBudget}
          />
          <p
            className={`text-[11px] ${
              isOverBudget
                ? "text-destructive/80 font-medium"
                : "text-emerald-800/80 dark:text-emerald-400"
            }`}
          >
            {isOverBudget
              ? "Monthly spending limit exceeded by personal expenses"
              : "Safe planned allowance remaining for the month"}
          </p>
        </div>
      </div>

      {/* Utilization Bar */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium">Overall Utilization Progress</span>
          <span className="font-mono text-xs font-semibold text-foreground">
            {summary.utilizationPercent}% of limit
          </span>
        </div>
        <BudgetProgress
          spentPaise={summary.overallSpentPaise}
          limitPaise={summary.overallLimitPaise}
        />
      </div>

      {/* Non-Negotiable Financial Invariant Callout */}
      <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs flex items-start gap-2.5">
        <Info className="size-4 text-kivo-secondary shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold text-foreground block">
            Budget Remaining ≠ Actual Account Balance ≠ Safe-to-Spend
          </span>
          <p className="text-[11px] text-muted-foreground leading-normal">
            A budget is a discretionary spending plan, not actual liquid money. Having remaining
            budget does not mean funds exist in your bank account, and having account balance does
            not mean it is safe to spend after reserving rent and debt obligations.
          </p>
        </div>
      </div>
    </div>
  );
}
