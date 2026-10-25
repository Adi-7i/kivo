"use client";
import { Edit2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServerMoney } from "@/features/shared-financial/ServerMoney";
import { BudgetProgress } from "./BudgetProgress";
import { BudgetStatusBadge } from "./BudgetStatusBadge";
import type { BudgetDTO } from "../api";

export function BudgetCard({
  budget,
  categoryName,
  onEdit,
  className,
}: {
  budget: BudgetDTO;
  categoryName?: string;
  onEdit?: (budget: BudgetDTO) => void;
  className?: string;
}) {
  return (
    <article
      data-testid={"budget-card-" + budget.id}
      className={`rounded-xl border p-4 sm:p-5 shadow-xs space-y-4 ${budget.warning_state === "exceeded" ? "border-destructive/40 bg-destructive/5" : "border-border/80 bg-card"} ${className ?? ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex gap-2 min-w-0">
          <Layers className="size-4 text-kivo-primary shrink-0 mt-1" />
          <div className="min-w-0">
            <h3 className="font-heading font-semibold text-sm break-words">{budget.name}</h3>
            <p className="text-xs text-muted-foreground">
              {budget.category ? (categoryName ?? "Category unavailable") : "Overall spending cap"}
              {budget.archived ? " · Archived" : ""}
            </p>
          </div>
        </div>
        {onEdit && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={"Edit " + budget.name + " limit"}
            onClick={() => onEdit(budget)}
            className="size-7 shrink-0"
          >
            <Edit2 className="size-3.5" />
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {budget.period_start} to {budget.period_end} · {budget.period_type}
      </p>
      <BudgetStatusBadge status={budget.warning_state} warningPercent={budget.warning_percent} />
      <dl className="grid grid-cols-2 gap-3 text-xs">
        {(
          [
            ["Budget Limit", budget.limit],
            ["Spent", budget.spent],
            ["Budget Remaining", budget.remaining],
            ["Over limit by", budget.overspending],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd data-testid={"budget-" + label.toLowerCase().replaceAll(" ", "-")}>
              <ServerMoney value={value} />
            </dd>
          </div>
        ))}
      </dl>
      <BudgetProgress utilization={budget.utilization_percent} showLabel />
    </article>
  );
}
