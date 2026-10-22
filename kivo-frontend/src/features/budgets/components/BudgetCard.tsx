import * as React from "react";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { BudgetProgress, getBudgetStatus } from "./BudgetProgress";
import { BudgetStatusBadge } from "./BudgetStatusBadge";
import { Button } from "@/components/ui/button";
import { Edit2, AlertTriangle, Layers } from "lucide-react";
import type { BudgetEntity } from "../types";

interface BudgetCardProps {
  budget: BudgetEntity;
  onEdit?: (budget: BudgetEntity) => void;
  className?: string;
}

export function BudgetCard({ budget, onEdit, className }: BudgetCardProps) {
  const isOverBudget = budget.spentPaise > budget.limitPaise;
  const remainingPaise = Math.max(0, budget.limitPaise - budget.spentPaise);
  const overspendPaise = Math.max(0, budget.spentPaise - budget.limitPaise);
  const percent =
    budget.limitPaise > 0
      ? Math.round((budget.spentPaise / budget.limitPaise) * 100)
      : budget.spentPaise > 0
        ? 100
        : 0;
  const status = getBudgetStatus(budget.spentPaise, budget.limitPaise);

  const getBorderAccent = () => {
    switch (status) {
      case "exceeded":
        return "border-destructive/40 bg-destructive/5 hover:border-destructive/60";
      case "full":
        return "border-blue-400/40 bg-blue-50/20 dark:bg-blue-950/10 hover:border-blue-400/60";
      case "warning":
        return "border-amber-400/40 bg-amber-50/20 dark:bg-amber-950/10 hover:border-amber-400/60";
      case "normal":
      default:
        return "border-border/80 bg-card hover:border-kivo-primary/40";
    }
  };

  return (
    <div
      data-testid={`budget-card-${budget.id}`}
      className={`rounded-xl border p-4 sm:p-5 shadow-xs transition-all space-y-4 flex flex-col justify-between ${getBorderAccent()} ${className || ""}`}
    >
      <div className="space-y-3">
        {/* Header: Category / Type & Edit Action */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-8 rounded-lg bg-kivo-primary/10 text-kivo-primary flex items-center justify-center shrink-0">
              <Layers className="size-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-heading font-semibold text-sm sm:text-base text-foreground truncate">
                {budget.type === "overall"
                  ? "Overall Monthly Cap"
                  : budget.categoryName || "Category Budget"}
              </h3>
              <span className="text-[11px] text-muted-foreground block truncate">
                Period {budget.period}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <BudgetStatusBadge status={status} />
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(budget)}
                aria-label={`Edit ${budget.categoryName || "budget"} limit`}
                className="size-7 text-muted-foreground hover:text-foreground"
              >
                <Edit2 className="size-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Financial Metrics: Limit, Spent, Remaining/Overspend */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50 text-xs">
          <div>
            <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
              Budget Limit
            </span>
            <MoneyAmount paise={budget.limitPaise} size="sm" variant="default" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
              Spent
            </span>
            <MoneyAmount paise={budget.spentPaise} size="sm" variant="expense" />
          </div>
        </div>

        {/* Progress Bar & Percent Indicator */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground text-[11px]">Consumed</span>
            <span
              className={`font-mono text-xs font-semibold ${
                isOverBudget
                  ? "text-destructive"
                  : status === "warning"
                    ? "text-amber-800 dark:text-amber-400"
                    : "text-foreground"
              }`}
            >
              {percent}%
            </span>
          </div>
          <BudgetProgress spentPaise={budget.spentPaise} limitPaise={budget.limitPaise} />
        </div>

        {/* Remaining or Overspend Banner */}
        <div
          className={`flex items-center justify-between rounded-md p-2 text-xs ${
            isOverBudget
              ? "bg-destructive/10 text-destructive font-medium"
              : "bg-muted/40 text-muted-foreground"
          }`}
        >
          <span className="text-[11px] flex items-center gap-1">
            {isOverBudget && <AlertTriangle className="size-3 text-destructive shrink-0" />}
            <span>{isOverBudget ? "Over limit by:" : "Remaining allowance:"}</span>
          </span>
          <MoneyAmount
            paise={isOverBudget ? overspendPaise : remainingPaise}
            size="xs"
            variant={isOverBudget ? "expense" : "income"}
            showSign={isOverBudget}
          />
        </div>
      </div>

      {/* Notes / Description if present */}
      {budget.notes && (
        <p className="text-[11px] text-muted-foreground line-clamp-2 pt-1 border-t border-border/40 italic">
          {budget.notes}
        </p>
      )}
    </div>
  );
}
