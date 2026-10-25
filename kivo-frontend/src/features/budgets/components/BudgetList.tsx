"use client";
import * as React from "react";
import { BudgetCard } from "./BudgetCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BudgetDTO } from "../api";
import type { CategoryDTO } from "@/features/finance/api";
export function BudgetList({
  budgets,
  categories,
  onEdit,
  onAddCategory,
}: {
  budgets: BudgetDTO[];
  categories: CategoryDTO[];
  onEdit: (budget: BudgetDTO) => void;
  onAddCategory: () => void;
}) {
  const [search, setSearch] = React.useState(""),
    [status, setStatus] = React.useState("all");
  const rows = budgets
    .filter((b) => b.category)
    .filter(
      (b) =>
        (status === "all" || b.warning_state === status) &&
        (b.name + " " + categories.find((c) => c.id === b.category)?.name)
          .toLowerCase()
          .includes(search.toLowerCase())
    );
  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div>
          <h2 className="font-heading font-semibold text-base">Category Spending Budgets</h2>
          <p className="text-xs text-muted-foreground">
            Limits can overlap an overall budget; do not add their figures together.
          </p>
        </div>
        <Button size="sm" onClick={onAddCategory}>
          Add Category Budget
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Input
          aria-label="Search category budgets"
          placeholder="Search category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-64"
        />
        <select
          aria-label="Budget warning filter"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border bg-background px-3 text-xs"
        >
          {["all", "ok", "warning", "at_limit", "exceeded"].map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {rows.map((b) => (
          <BudgetCard
            key={b.id}
            budget={b}
            categoryName={categories.find((c) => c.id === b.category)?.name}
            onEdit={onEdit}
          />
        ))}
      </div>
      {!rows.length && (
        <p className="p-6 text-sm text-muted-foreground">
          No category budgets match this period and filter.
        </p>
      )}
    </section>
  );
}
