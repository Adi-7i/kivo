"use client";

import * as React from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppNav } from "@/components/layout/AppNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { AnalyticsSummaryCard } from "@/features/reports/components/AnalyticsSummaryCard";
import { SpendingTrendChart } from "@/features/reports/components/SpendingTrendChart";
import { CategoryBreakdownChart } from "@/features/reports/components/CategoryBreakdownChart";
import { IncomeExpenseChart } from "@/features/reports/components/IncomeExpenseChart";
import { SpendingDistributionChart } from "@/features/reports/components/SpendingDistributionChart";
import { FinancialComparison } from "@/features/reports/components/FinancialComparison";
import { ReportFilterBar } from "@/features/reports/components/ReportFilterBar";
import { ReportDetailPanel } from "@/features/reports/components/ReportDetailPanel";
import { CSVExportDialog } from "@/features/reports/components/CSVExportDialog";
import { AnalyticsEmptyState } from "@/features/reports/components/AnalyticsEmptyState";
import { AnalyticsSkeleton } from "@/features/reports/components/AnalyticsSkeleton";
import {
  PREVIEW_ANALYTICS_SUMMARY,
  PREVIEW_SPENDING_TREND_DAILY,
  PREVIEW_SPENDING_TREND_WEEKLY,
  PREVIEW_SPENDING_TREND_MONTHLY,
  PREVIEW_CATEGORY_BREAKDOWN,
  PREVIEW_INCOME_VS_EXPENSE,
  PREVIEW_SPENDING_DISTRIBUTION,
  PREVIEW_PERIOD_COMPARISON,
} from "@/features/reports/data/previewAnalytics";
import { Button } from "@/components/ui/button";
import { BarChart3, Download, Eye, Inbox, Loader2 } from "lucide-react";
import type { CategorySpendingItem, ReportFilterState } from "@/features/reports/types";

export default function ReportsPage() {
  const [viewMode, setViewMode] = React.useState<"populated" | "empty" | "loading">("populated");
  const [isExportOpen, setIsExportOpen] = React.useState(false);
  const [filters, setFilters] = React.useState<ReportFilterState>({
    period: "this_month",
  });
  const [selectedCategory, setSelectedCategory] = React.useState<CategorySpendingItem | null>(null);

  const handleResetFilters = () => {
    setFilters({ period: "this_month" });
    setSelectedCategory(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="border-b border-border bg-card/50">
        <PageContainer>
          <AppNav />
        </PageContainer>
      </div>

      <main className="py-6 sm:py-8 overflow-x-hidden">
        <PageContainer>
          <div className="space-y-6">
            {/* Top Toolbar: Header, Export Button, and View Mode Switcher */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="size-8 rounded-lg bg-kivo-primary/10 text-kivo-primary flex items-center justify-center">
                    <BarChart3 className="size-4" />
                  </div>
                  <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground tracking-tight">
                    Financial Analytics & Reports
                  </h1>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-kivo-primary/10 text-kivo-brand-dark dark:text-kivo-sage border border-kivo-primary/20">
                    Phase 6 UI
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Multi-dimensional financial analysis, expense velocity, channel distribution, and
                  CSV ledger export
                </p>
              </div>

              {/* Action Buttons: Export & View Switcher */}
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  size="sm"
                  onClick={() => setIsExportOpen(true)}
                  className="bg-kivo-primary hover:bg-kivo-brand-dark text-white gap-1.5 text-xs h-8 font-medium shadow-xs"
                >
                  <Download className="size-3.5" />
                  <span>Export CSV</span>
                </Button>

                {/* View Switcher */}
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

            {/* Filter Bar */}
            <ReportFilterBar filters={filters} onFilterChange={setFilters} />

            {/* Content Body */}
            {viewMode === "loading" ? (
              <AnalyticsSkeleton />
            ) : viewMode === "empty" ? (
              <AnalyticsEmptyState onResetFilters={handleResetFilters} />
            ) : (
              <div className="space-y-6">
                {/* 1. Analytics Summary Metrics */}
                <AnalyticsSummaryCard summary={PREVIEW_ANALYTICS_SUMMARY} />

                {/* 2. Cycle-over-Cycle Financial Comparison */}
                <FinancialComparison comparison={PREVIEW_PERIOD_COMPARISON} />

                {/* 3. Row of Charts: Trend & Category Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <SpendingTrendChart
                    dailyData={PREVIEW_SPENDING_TREND_DAILY}
                    weeklyData={PREVIEW_SPENDING_TREND_WEEKLY}
                    monthlyData={PREVIEW_SPENDING_TREND_MONTHLY}
                  />

                  <CategoryBreakdownChart
                    data={PREVIEW_CATEGORY_BREAKDOWN}
                    onSelectCategory={setSelectedCategory}
                  />
                </div>

                {/* 4. Row of Charts: Income vs Expense & Channel Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <IncomeExpenseChart data={PREVIEW_INCOME_VS_EXPENSE} />
                  <SpendingDistributionChart distribution={PREVIEW_SPENDING_DISTRIBUTION} />
                </div>

                {/* 5. Detailed Breakdown & Drill-Down Accordion */}
                <ReportDetailPanel
                  categories={PREVIEW_CATEGORY_BREAKDOWN}
                  distribution={PREVIEW_SPENDING_DISTRIBUTION}
                  selectedCategory={selectedCategory}
                  onClearCategory={() => setSelectedCategory(null)}
                />
              </div>
            )}
          </div>
        </PageContainer>
      </main>

      {/* CSV Export Configuration Dialog */}
      <CSVExportDialog
        open={isExportOpen}
        onOpenChange={setIsExportOpen}
        defaultStartDate="2026-10-01"
        defaultEndDate="2026-10-31"
      />
    </div>
  );
}
