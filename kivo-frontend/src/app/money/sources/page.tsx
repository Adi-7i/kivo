"use client";

import * as React from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { SectionHeader } from "@/features/shared-financial/SectionHeader";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { SourceFilterBar } from "@/features/funding/components/SourceFilterBar";
import { FundingSourceList } from "@/features/funding/components/FundingSourceList";
import { FinancialEmptyState } from "@/features/shared-financial/FinancialEmptyState";
import {
  FinancialSummaryCardSkeleton,
  TransactionRowSkeleton,
} from "@/features/shared-financial/FinancialSkeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { PREVIEW_SOURCES } from "@/features/funding/data/previewSources";
import type { FundingFilterState } from "@/features/funding/types";
import {
  Layers,
  Info,
  ArrowDownLeft,
  ArrowUpRight,
  HandCoins,
  Clock,
  Landmark,
  Eye,
  Inbox,
  Loader2,
} from "lucide-react";

export default function MoneySourcesPage() {
  const [viewMode, setViewMode] = React.useState<"populated" | "empty" | "loading">("populated");

  const [filters, setFilters] = React.useState<FundingFilterState>({
    search: "",
    status: "all",
    accountId: "all",
    sortBy: "date_desc",
  });

  const handleFilterChange = (updates: Partial<FundingFilterState>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: "",
      status: "all",
      accountId: "all",
      sortBy: "date_desc",
    });
  };

  // Filter & sort sources in memory
  const filteredSources = React.useMemo(() => {
    if (viewMode === "empty") return [];

    return PREVIEW_SOURCES.filter((src) => {
      // 1. Search filter
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase();
        const matchesName = src.name.toLowerCase().includes(q);
        const matchesPerson = src.sourcePerson?.toLowerCase().includes(q);
        const matchesNotes = src.notes?.toLowerCase().includes(q);
        const matchesAccount = src.creditedAccountName.toLowerCase().includes(q);
        if (!matchesName && !matchesPerson && !matchesNotes && !matchesAccount) {
          return false;
        }
      }

      // 2. Status filter
      if (filters.status !== "all" && src.status !== filters.status) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (filters.sortBy === "date_desc") {
        return b.receivedDate.localeCompare(a.receivedDate);
      }
      if (filters.sortBy === "date_asc") {
        return a.receivedDate.localeCompare(b.receivedDate);
      }
      if (filters.sortBy === "amount_desc") {
        return b.originalAmountPaise - a.originalAmountPaise;
      }
      if (filters.sortBy === "amount_asc") {
        return a.originalAmountPaise - b.originalAmountPaise;
      }
      if (filters.sortBy === "remaining_desc") {
        return b.remainingPaise - a.remainingPaise;
      }
      return 0;
    });
  }, [filters, viewMode]);

  // Aggregate totals
  const totalStats = React.useMemo(() => {
    return PREVIEW_SOURCES.reduce(
      (acc, s) => ({
        original: acc.original + s.originalAmountPaise,
        spent: acc.spent + s.attributedSpentPaise,
        lent: acc.lent + s.attributedLentPaise,
        remaining: acc.remaining + s.remainingPaise,
      }),
      { original: 0, spent: 0, lent: 0, remaining: 0 }
    );
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader />

      <PageContainer>
        <main className="py-8 space-y-6">
          {/* View Mode Switcher for UI Verification & Testing */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card/60">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Phase 4 View Switcher:
              </span>
              <span className="text-xs text-foreground font-medium">
                Verify UI across data states
              </span>
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-auto bg-muted p-1 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setViewMode("populated")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                  viewMode === "populated"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Eye className="size-3.5" />
                <span>Overview ({PREVIEW_SOURCES.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("empty")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                  viewMode === "empty"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Inbox className="size-3.5" />
                <span>Empty State</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("loading")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                  viewMode === "loading"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Loader2 className="size-3.5" />
                <span>Loading Skeletons</span>
              </button>
            </div>
          </div>

          {/* Architecture & Integration Notice */}
          <Alert className="border-kivo-sage/50 bg-kivo-sage/10 text-foreground">
            <Info className="size-4 text-kivo-primary mt-0.5" />
            <AlertTitle className="font-semibold text-kivo-brand-dark dark:text-kivo-sage">
              Fund Journey & FIFO Attribution UI Architecture
            </AlertTitle>
            <AlertDescription className="text-muted-foreground mt-1 text-xs leading-relaxed">
              This screen displays the incoming money batches, FIFO allocation progress, lent
              receivables, and exhaustion records. Live calculations will sync directly with the
              Django backend engine.
            </AlertDescription>
          </Alert>

          {/* Sub-Navigation between Money Accounts and Money Sources */}
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Link
              href="/money"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Landmark className="size-3.5" />
              <span>Money Accounts</span>
            </Link>
            <Link
              href="/money/sources"
              className="inline-flex items-center gap-1.5 rounded-lg bg-kivo-primary px-3 py-1.5 text-xs font-semibold text-white shadow-xs"
            >
              <Layers className="size-3.5" />
              <span>Money Sources & Journeys</span>
            </Link>
          </div>

          {/* Section Header */}
          <SectionHeader
            title="Money Sources & Fund Journey"
            description="Track every incoming money batch, its FIFO-attributed living expenses, friend loans, and calendar exhaustion."
          />

          {/* Aggregate Overview Metric Cards */}
          {viewMode === "loading" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <FinancialSummaryCardSkeleton key={i} />
              ))}
            </div>
          ) : viewMode === "empty" ? null : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Total Inflow */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Total Inflow Batches
                  </span>
                  <ArrowDownLeft className="size-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <MoneyAmount
                  paise={totalStats.original}
                  size="lg"
                  tabular
                  className="font-extrabold text-foreground"
                />
                <p className="text-[11px] text-muted-foreground">
                  Across {PREVIEW_SOURCES.length} recorded sources
                </p>
              </div>

              {/* Total Spent */}
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-destructive">
                    Attributed Personal Spent
                  </span>
                  <ArrowUpRight className="size-4 text-destructive" />
                </div>
                <MoneyAmount
                  paise={totalStats.spent}
                  size="lg"
                  tabular
                  className="font-extrabold text-destructive"
                />
                <p className="text-[11px] text-muted-foreground">Permanent personal consumption</p>
              </div>

              {/* Total Lent */}
              <div className="rounded-xl border border-blue-600/20 bg-blue-500/5 p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                    Attributed Lent (Asset)
                  </span>
                  <HandCoins className="size-4 text-blue-600 dark:text-blue-400" />
                </div>
                <MoneyAmount
                  paise={totalStats.lent}
                  size="lg"
                  tabular
                  className="font-extrabold text-blue-600"
                />
                <p className="text-[11px] text-muted-foreground">
                  Receivables expected to be repaid
                </p>
              </div>

              {/* Remaining Liquid */}
              <div className="rounded-xl border border-kivo-primary/25 bg-kivo-primary/5 p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-kivo-brand-dark dark:text-kivo-sage">
                    Remaining Liquid Allocation
                  </span>
                  <Clock className="size-4 text-kivo-primary" />
                </div>
                <MoneyAmount
                  paise={totalStats.remaining}
                  size="lg"
                  tabular
                  className="font-extrabold text-kivo-primary"
                />
                <p className="text-[11px] text-muted-foreground">Available for FIFO attribution</p>
              </div>
            </div>
          )}

          {/* Filtering & Source List */}
          {viewMode === "loading" ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <TransactionRowSkeleton key={i} />
              ))}
            </div>
          ) : viewMode === "empty" ? (
            <FinancialEmptyState
              title="No Money Sources Recorded"
              description="No incoming funds have been registered yet. When allowance, salary, or gifts arrive, they establish a funding batch."
              icon={<Inbox className="size-8 text-muted-foreground" />}
            />
          ) : (
            <div className="space-y-4">
              <SourceFilterBar
                filters={filters}
                onFilterChange={handleFilterChange}
                onReset={handleResetFilters}
              />

              <FundingSourceList sources={filteredSources} onResetFilters={handleResetFilters} />
            </div>
          )}
        </main>
      </PageContainer>
    </div>
  );
}
