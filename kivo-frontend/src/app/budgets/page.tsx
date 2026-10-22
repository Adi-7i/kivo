"use client";

import * as React from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppNav } from "@/components/layout/AppNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { BudgetOverview } from "@/features/budgets/components/BudgetOverview";
import { BudgetList } from "@/features/budgets/components/BudgetList";
import { BudgetModal } from "@/features/budgets/components/BudgetModal";
import { BudgetPeriodSelector } from "@/features/budgets/components/BudgetPeriodSelector";
import { BudgetEmptyState } from "@/features/budgets/components/BudgetEmptyState";
import { BudgetSkeleton } from "@/features/budgets/components/BudgetSkeleton";
import { PREVIEW_BUDGETS, PREVIEW_BUDGET_SUMMARY } from "@/features/budgets/data/previewBudgets";
import { Target, Eye, Inbox, Loader2 } from "lucide-react";
import type { BudgetEntity, BudgetType } from "@/features/budgets/types";

export default function BudgetsPage() {
  const [viewMode, setViewMode] = React.useState<"populated" | "empty" | "loading">("populated");
  const [currentPeriod, setCurrentPeriod] = React.useState<string>("2026-10");
  const budgets = PREVIEW_BUDGETS;
  const summary = PREVIEW_BUDGET_SUMMARY;

  // Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingBudget, setEditingBudget] = React.useState<BudgetEntity | null>(null);
  const [modalDefaultType, setModalDefaultType] = React.useState<BudgetType>("category");

  const overallBudget = React.useMemo(() => {
    return budgets.find((b) => b.type === "overall");
  }, [budgets]);

  const handleCreateOverall = () => {
    setEditingBudget(overallBudget || null);
    setModalDefaultType("overall");
    setIsModalOpen(true);
  };

  const handleCreateCategory = () => {
    setEditingBudget(null);
    setModalDefaultType("category");
    setIsModalOpen(true);
  };

  const handleEditBudget = (budget: BudgetEntity) => {
    setEditingBudget(budget);
    setModalDefaultType(budget.type);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="border-b border-border bg-card/50">
        <PageContainer>
          <AppNav />
        </PageContainer>
      </div>

      <main className="py-6 sm:py-8">
        <PageContainer>
          <div className="space-y-6">
            {/* Top Toolbar: Title, Period Selector, View Mode Switcher */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="size-8 rounded-lg bg-kivo-primary/10 text-kivo-primary flex items-center justify-center">
                    <Target className="size-4" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground tracking-tight">
                    Budget Management
                  </h1>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-kivo-primary/10 text-kivo-brand-dark dark:text-kivo-sage border border-kivo-primary/20">
                    Phase 6 UI
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Proactive spending planning and category limits. Budget remaining does not equal
                  liquid account balance.
                </p>
              </div>

              {/* Controls: Period Selector & View Mode Switcher */}
              <div className="flex items-center gap-3 flex-wrap">
                <BudgetPeriodSelector
                  currentPeriod={currentPeriod}
                  onPeriodChange={setCurrentPeriod}
                />

                {/* View Switcher: Populated / Empty / Loading */}
                <div
                  className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/80 text-xs"
                  role="tablist"
                  aria-label="View Mode"
                >
                  <button
                    type="button"
                    role="tab"
                    onClick={() => setViewMode("populated")}
                    aria-selected={viewMode === "populated"}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all ${
                      viewMode === "populated"
                        ? "bg-card text-foreground shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Eye className="size-3" />
                    <span>Preview</span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    onClick={() => setViewMode("empty")}
                    aria-selected={viewMode === "empty"}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all ${
                      viewMode === "empty"
                        ? "bg-card text-foreground shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Inbox className="size-3" />
                    <span>Empty</span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    onClick={() => setViewMode("loading")}
                    aria-selected={viewMode === "loading"}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all ${
                      viewMode === "loading"
                        ? "bg-card text-foreground shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Loader2 className="size-3" />
                    <span>Loading</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content Area based on View Mode */}
            {viewMode === "loading" ? (
              <BudgetSkeleton />
            ) : viewMode === "empty" ? (
              <BudgetEmptyState onSetBudget={handleCreateOverall} period={currentPeriod} />
            ) : (
              <div className="space-y-6">
                {/* 1. Monthly Budget Overview Hero */}
                <BudgetOverview
                  summary={summary}
                  overallBudget={overallBudget}
                  onSetBudget={handleCreateOverall}
                />

                {/* 2. Category Budgets Section */}
                <BudgetList
                  budgets={budgets}
                  onEdit={handleEditBudget}
                  onAddCategory={handleCreateCategory}
                />
              </div>
            )}
          </div>
        </PageContainer>
      </main>

      {/* Create / Edit Budget Modal */}
      <BudgetModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        budget={editingBudget}
        defaultType={modalDefaultType}
        defaultPeriod={currentPeriod}
      />
    </div>
  );
}
