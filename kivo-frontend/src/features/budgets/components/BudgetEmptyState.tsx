"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Target, PlusCircle, Info } from "lucide-react";

interface BudgetEmptyStateProps {
  onSetBudget?: () => void;
  period?: string;
}

export function BudgetEmptyState({ onSetBudget, period = "2026-10" }: BudgetEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-8 sm:p-12 text-center space-y-6 bg-card/40">
      <div className="size-14 rounded-2xl bg-kivo-primary/10 text-kivo-primary flex items-center justify-center mx-auto shadow-xs">
        <Target className="size-7" />
      </div>

      <div className="space-y-2 max-w-md mx-auto">
        <h3 className="text-lg font-heading font-bold text-foreground">
          No Spending Budgets Configured for {period}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Set up an overall monthly spending ceiling or define specific limits for categories like
          Groceries, Dining, and Living Expenses.
        </p>
      </div>

      {onSetBudget && (
        <Button
          onClick={onSetBudget}
          className="bg-kivo-primary hover:bg-kivo-brand-dark text-white gap-2 text-xs font-medium px-4 py-2"
        >
          <PlusCircle className="size-4" />
          <span>Set Up Monthly Budget</span>
        </Button>
      )}

      {/* Financial clarification */}
      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-xs max-w-lg mx-auto text-left flex items-start gap-3">
        <Info className="size-4 text-kivo-secondary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-foreground block">
            Budget Principle: Discretionary Ceiling, Not Liquid Cash
          </span>
          <p className="text-[11px] text-muted-foreground leading-normal">
            Budgets in Kivo guide your spending discipline. They do not hold, lock, or transfer
            money between your bank accounts or cash wallets.
          </p>
        </div>
      </div>
    </div>
  );
}
