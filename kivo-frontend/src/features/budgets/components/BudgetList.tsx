"use client";

import * as React from "react";
import { BudgetCard } from "./BudgetCard";
import { getBudgetStatus } from "./BudgetProgress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, Layers, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";
import type { BudgetEntity } from "../types";

interface BudgetListProps {
  budgets: BudgetEntity[];
  onEdit?: (budget: BudgetEntity) => void;
  onAddCategory?: () => void;
}

type FilterTab = "all" | "normal" | "warning" | "exceeded";

export function BudgetList({ budgets, onEdit, onAddCategory }: BudgetListProps) {
  const [activeTab, setActiveTab] = React.useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Only display category budgets in this list (overall budget is prominently in BudgetOverview)
  const categoryBudgets = React.useMemo(() => {
    return budgets.filter((b) => b.type === "category");
  }, [budgets]);

  const counts = React.useMemo(() => {
    const normal = categoryBudgets.filter(
      (b) => getBudgetStatus(b.spentPaise, b.limitPaise) === "normal"
    ).length;
    const warning = categoryBudgets.filter((b) => {
      const s = getBudgetStatus(b.spentPaise, b.limitPaise);
      return s === "warning" || s === "full";
    }).length;
    const exceeded = categoryBudgets.filter(
      (b) => getBudgetStatus(b.spentPaise, b.limitPaise) === "exceeded"
    ).length;

    return { all: categoryBudgets.length, normal, warning, exceeded };
  }, [categoryBudgets]);

  const filteredBudgets = React.useMemo(() => {
    return categoryBudgets.filter((b) => {
      const status = getBudgetStatus(b.spentPaise, b.limitPaise);

      if (activeTab === "normal" && status !== "normal") return false;
      if (activeTab === "warning" && status !== "warning" && status !== "full") return false;
      if (activeTab === "exceeded" && status !== "exceeded") return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const nameMatch = b.categoryName?.toLowerCase().includes(query);
        const notesMatch = b.notes?.toLowerCase().includes(query);
        return Boolean(nameMatch || notesMatch);
      }

      return true;
    });
  }, [categoryBudgets, activeTab, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Header Bar: Title, Search, and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-heading font-semibold text-foreground flex items-center gap-2">
            <span>Category Spending Budgets</span>
            <span className="text-xs font-mono font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {categoryBudgets.length} total
            </span>
          </h3>
          <p className="text-xs text-muted-foreground">
            Target spending boundaries allocated to individual expense categories
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>

          {onAddCategory && (
            <Button
              size="sm"
              onClick={onAddCategory}
              className="bg-kivo-primary hover:bg-kivo-brand-dark text-white gap-1 text-xs h-8 shrink-0 font-medium"
            >
              <PlusCircle className="size-3.5" />
              <span>Add Category Budget</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === "all"
              ? "bg-kivo-primary text-white shadow-xs"
              : "bg-card border border-border text-muted-foreground hover:bg-muted/40"
          }`}
        >
          <Layers className="size-3.5" />
          <span>All ({counts.all})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("normal")}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === "normal"
              ? "bg-emerald-700 text-white shadow-xs"
              : "bg-card border border-border text-muted-foreground hover:bg-muted/40"
          }`}
        >
          <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>On Track ({counts.normal})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("warning")}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === "warning"
              ? "bg-amber-700 text-white shadow-xs"
              : "bg-card border border-border text-muted-foreground hover:bg-muted/40"
          }`}
        >
          <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-400" />
          <span>Approaching Limit ({counts.warning})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("exceeded")}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === "exceeded"
              ? "bg-destructive text-white shadow-xs"
              : "bg-card border border-border text-muted-foreground hover:bg-muted/40"
          }`}
        >
          <ShieldAlert className="size-3.5 text-destructive" />
          <span>Over Budget ({counts.exceeded})</span>
        </button>
      </div>

      {/* Grid of Category Budgets */}
      {filteredBudgets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredBudgets.map((budget) => (
            <BudgetCard key={budget.id} budget={budget} onEdit={onEdit} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-3 bg-muted/10">
          <div className="size-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Layers className="size-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-foreground">No category budgets found</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery
                ? `No budget categories matched "${searchQuery}".`
                : activeTab !== "all"
                  ? `No categories in the "${activeTab}" status bracket.`
                  : "No category-specific spending limits have been created for this month."}
            </p>
          </div>
          {onAddCategory && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAddCategory}
              className="gap-1.5 text-xs text-kivo-primary hover:text-kivo-brand-dark"
            >
              <PlusCircle className="size-3.5" />
              <span>Add Category Budget</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
