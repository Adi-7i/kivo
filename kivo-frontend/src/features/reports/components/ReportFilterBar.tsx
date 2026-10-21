"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, X, RotateCcw } from "lucide-react";
import type { PeriodPreset, ReportFilterState } from "../types";

interface ReportFilterBarProps {
  filters: ReportFilterState;
  onFilterChange: (filters: ReportFilterState) => void;
  className?: string;
}

const PERIOD_PRESETS: { label: string; value: PeriodPreset }[] = [
  { label: "This Month", value: "this_month" },
  { label: "Previous Month", value: "previous_month" },
  { label: "This Week", value: "this_week" },
  { label: "Last 7 Days", value: "last_7_days" },
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "This Year", value: "this_year" },
  { label: "Custom Range", value: "custom" },
];

export function ReportFilterBar({ filters, onFilterChange, className }: ReportFilterBarProps) {
  const [isCustomOpen, setIsCustomOpen] = React.useState(filters.period === "custom");
  const [customStart, setCustomStart] = React.useState(filters.startDate || "2026-10-01");
  const [customEnd, setCustomEnd] = React.useState(filters.endDate || "2026-10-31");
  const [dateError, setDateError] = React.useState<string | null>(null);

  const handlePeriodClick = (preset: PeriodPreset) => {
    if (preset === "custom") {
      setIsCustomOpen(true);
      onFilterChange({
        ...filters,
        period: "custom",
        startDate: customStart,
        endDate: customEnd,
      });
    } else {
      setIsCustomOpen(false);
      setDateError(null);
      onFilterChange({
        ...filters,
        period: preset,
        startDate: undefined,
        endDate: undefined,
      });
    }
  };

  const handleApplyCustomDate = () => {
    if (!customStart || !customEnd) {
      setDateError("Both start and end dates are required");
      return;
    }
    if (customStart > customEnd) {
      setDateError("Start date cannot be after end date");
      return;
    }
    setDateError(null);
    onFilterChange({
      ...filters,
      period: "custom",
      startDate: customStart,
      endDate: customEnd,
    });
  };

  const handleClearFilter = (key: keyof ReportFilterState) => {
    const next = { ...filters };
    delete next[key];
    if (key === "period") {
      next.period = "this_month";
      setIsCustomOpen(false);
    }
    onFilterChange(next);
  };

  const handleResetAll = () => {
    setIsCustomOpen(false);
    setDateError(null);
    onFilterChange({
      period: "this_month",
    });
  };

  const hasActiveFilters = Boolean(
    filters.period !== "this_month" ||
    filters.accountId ||
    filters.category ||
    filters.transactionType
  );

  return (
    <div
      className={`rounded-xl border border-border/80 bg-card p-3 sm:p-4 shadow-2xs space-y-3 ${className || ""}`}
    >
      {/* Top Row: Presets and Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Preset Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
          <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground mr-1">
            <Calendar className="size-3.5 text-kivo-primary" />
            <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider">
              Period:
            </span>
          </div>

          {PERIOD_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => handlePeriodClick(p.value)}
              className={`px-2.5 py-1 rounded-md font-medium transition-all shrink-0 ${
                filters.period === p.value
                  ? "bg-kivo-primary text-white shadow-2xs font-semibold"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Secondary Filter Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Account Filter */}
          <select
            value={filters.accountId || ""}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                accountId: e.target.value || undefined,
              })
            }
            className="rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All Accounts</option>
            <option value="acc-hdfc">HDFC Salary</option>
            <option value="acc-icici">ICICI Wallet</option>
            <option value="acc-cash">Cash Wallet</option>
          </select>

          {/* Category Filter */}
          <select
            value={filters.category || ""}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                category: e.target.value || undefined,
              })
            }
            className="rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All Categories</option>
            <option value="Food & Groceries">Food & Groceries</option>
            <option value="Living Expenses">Living Expenses</option>
            <option value="Dining & Entertainment">Dining & Entertainment</option>
            <option value="Utilities & Bills">Utilities & Bills</option>
            <option value="Shopping & Personal">Shopping & Personal</option>
            <option value="Transit & Fuel">Transit & Fuel</option>
          </select>

          {/* Reset All */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetAll}
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
            >
              <RotateCcw className="size-3" />
              <span>Reset</span>
            </Button>
          )}
        </div>
      </div>

      {/* Custom Date Range Panel (when period === 'custom') */}
      {isCustomOpen && (
        <div className="rounded-lg border border-border/80 bg-muted/20 p-3 flex flex-col sm:flex-row sm:items-center gap-3 text-xs">
          <span className="font-medium text-foreground text-[11px] uppercase tracking-wider shrink-0">
            Custom Date Range:
          </span>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">From:</span>
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-7 text-xs w-36"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">To:</span>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-7 text-xs w-36"
              />
            </div>

            <Button
              size="sm"
              onClick={handleApplyCustomDate}
              className="h-7 text-xs bg-kivo-primary hover:bg-kivo-brand-dark text-white px-3"
            >
              Apply Dates
            </Button>
          </div>

          {dateError && <span className="text-xs text-destructive font-medium">{dateError}</span>}
        </div>
      )}

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-border/40 text-[11px]">
          <span className="text-muted-foreground">Active filters:</span>

          {filters.period !== "this_month" && (
            <span className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded-md text-foreground">
              <span>
                Period:{" "}
                {filters.period === "custom"
                  ? `${filters.startDate} to ${filters.endDate}`
                  : filters.period.replaceAll("_", " ")}
              </span>
              <button
                type="button"
                onClick={() => handleClearFilter("period")}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </span>
          )}

          {filters.accountId && (
            <span className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded-md text-foreground">
              <span>Account: {filters.accountId}</span>
              <button
                type="button"
                onClick={() => handleClearFilter("accountId")}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </span>
          )}

          {filters.category && (
            <span className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded-md text-foreground">
              <span>Category: {filters.category}</span>
              <button
                type="button"
                onClick={() => handleClearFilter("category")}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
