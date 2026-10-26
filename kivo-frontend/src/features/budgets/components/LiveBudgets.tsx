"use client";
import * as React from "react";
import { Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { todayInKolkata } from "@/features/onboarding/money";
import { useCategories } from "@/features/finance/queries";
import { QueryState } from "@/features/finance/QueryState";
import { useBudgets } from "../queries";
import { monthBounds, type BudgetDTO } from "../api";
import { BudgetOverview } from "./BudgetOverview";
import { BudgetList } from "./BudgetList";
import { BudgetModal } from "./BudgetModal";
import { BudgetPeriodSelector } from "./BudgetPeriodSelector";
import { BudgetSkeleton } from "./BudgetSkeleton";
export function LiveBudgets() {
  const [month, setMonth] = React.useState(todayInKolkata().slice(0, 7)),
    [allPeriods, setAllPeriods] = React.useState(false),
    [archived, setArchived] = React.useState("false");
  const [modal, setModal] = React.useState<{
    budget?: BudgetDTO;
    type: "overall" | "category";
  } | null>(null);
  const query = useBudgets(archived),
    categories = useCategories();
  const bounds = monthBounds(month);
  const rows = (query.data ?? []).filter(
    (b) => allPeriods || (b.period_start <= bounds.end && b.period_end >= bounds.start)
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="flex gap-2 items-center text-xl sm:text-2xl font-heading font-bold">
            <Target className="size-5 text-kivo-primary" />
            Budget Management
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Budget Remaining ≠ Actual Account Balance ≠ Safe-to-Spend
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <BudgetPeriodSelector currentPeriod={month} onPeriodChange={setMonth} />
          <label className="text-xs flex items-center gap-2">
            <input
              type="checkbox"
              checked={allPeriods}
              onChange={(e) => setAllPeriods(e.target.checked)}
            />
            All periods
          </label>
          <select
            aria-label="Budget archive filter"
            value={archived}
            onChange={(e) => setArchived(e.target.value)}
            className="rounded-md border bg-background p-2 text-xs"
          >
            <option value="false">Active budgets</option>
            <option value="true">Archived budgets</option>
            <option value="all">All budgets</option>
          </select>
          <Button size="sm" onClick={() => setModal({ type: "overall" })}>
            Set Monthly Budget
          </Button>
        </div>
      </div>
      {query.isPending ? <BudgetSkeleton /> : <QueryState query={query} />}
      <QueryState query={categories} />
      {query.isSuccess && (
        <div className="space-y-6">
          {!rows.length && (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <h2 className="font-heading font-semibold">No Spending Budgets Configured</h2>
              <p className="text-xs text-muted-foreground mt-2">
                No budgets match the selected period and filters.
              </p>
            </div>
          )}
          {rows
            .filter((b) => !b.category)
            .map((b) => (
              <BudgetOverview
                key={b.id}
                budget={b}
                onEdit={(budget) => setModal({ budget, type: "overall" })}
              />
            ))}
          <BudgetList
            budgets={rows}
            categories={categories.data ?? []}
            onEdit={(budget) => setModal({ budget, type: "category" })}
            onAddCategory={() => setModal({ type: "category" })}
          />
          <p className="text-xs text-muted-foreground">
            Showing your selected budget periods. Include archived budgets to view past plans.
          </p>
        </div>
      )}
      {modal && (
        <BudgetModal
          key={modal.budget?.id ?? "create"}
          open
          onOpenChange={(open) => {
            if (!open) setModal(null);
          }}
          budget={modal.budget}
          defaultType={modal.type}
          defaultPeriod={month}
        />
      )}
    </div>
  );
}
