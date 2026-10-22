"use client";

import * as React from "react";
import { Search, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FundingFilterState, FundingStatus } from "../types";

interface SourceFilterBarProps {
  filters: FundingFilterState;
  onFilterChange: (updates: Partial<FundingFilterState>) => void;
  onReset: () => void;
  className?: string;
}

const STATUS_OPTIONS: { label: string; value: "all" | FundingStatus }[] = [
  { label: "All Sources", value: "all" },
  { label: "Active", value: "active" },
  { label: "Exhausted", value: "exhausted" },
  { label: "Partially Allocated", value: "partially_allocated" },
  { label: "Unresolved", value: "unresolved" },
];

export function SourceFilterBar({
  filters,
  onFilterChange,
  onReset,
  className,
}: SourceFilterBarProps) {
  const isFiltered =
    filters.search !== "" ||
    filters.status !== "all" ||
    filters.accountId !== "all" ||
    filters.sortBy !== "date_desc";

  return (
    <div className={`space-y-3 ${className ?? ""}`}>
      {/* Top row: Search input & Sort select */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            placeholder="Search source name, person, notes..."
            className="w-full h-9 pl-9 pr-3 text-xs bg-card border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-kivo-primary/30"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filters.sortBy}
            onChange={(e) =>
              onFilterChange({
                sortBy: e.target.value as FundingFilterState["sortBy"],
              })
            }
            aria-label="Sort money sources"
            className="h-9 px-3 text-xs bg-card border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-kivo-primary/30"
          >
            <option value="date_desc">Newest Inflow</option>
            <option value="date_asc">Oldest Inflow</option>
            <option value="amount_desc">Highest Amount</option>
            <option value="amount_asc">Lowest Amount</option>
            <option value="remaining_desc">Highest Remaining</option>
          </select>

          {isFiltered && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="h-9 gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-3" />
              <span>Reset</span>
            </Button>
          )}
        </div>
      </div>

      {/* Bottom row: Status Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {STATUS_OPTIONS.map((opt) => {
          const isActive = filters.status === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onFilterChange({ status: opt.value })}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-kivo-primary text-white shadow-xs"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
