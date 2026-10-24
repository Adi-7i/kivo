"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, RotateCcw } from "lucide-react";
import type { TransactionFilterState } from "../types";
import type { AccountEntity } from "@/features/accounts/types";

interface TransactionFilterBarProps {
  filters: TransactionFilterState;
  onFilterChange: (newFilters: Partial<TransactionFilterState>) => void;
  onReset: () => void;
  accounts: AccountEntity[];
  categories: (string | { id: string; name: string })[];
}

export function TransactionFilterBar({
  filters,
  onFilterChange,
  onReset,
  accounts,
  categories,
}: TransactionFilterBarProps) {
  const isFiltered =
    filters.search !== "" ||
    filters.kind !== "all" ||
    filters.accountId !== "all" ||
    filters.categoryName !== "all" ||
    filters.datePreset !== "this_month";

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-2xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            placeholder="Search title, merchant, notes..."
            className="pl-9 h-8 text-xs"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onFilterChange({ search: "" })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Account Filter */}
        <select
          aria-label="Filter account"
          value={filters.accountId}
          onChange={(e) => onFilterChange({ accountId: e.target.value })}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all" className="bg-card text-foreground">
            All Accounts
          </option>
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id} className="bg-card text-foreground">
              {acc.name}
            </option>
          ))}
        </select>

        {/* Category Filter */}
        <select
          aria-label="Filter category"
          value={filters.categoryName}
          onChange={(e) => onFilterChange({ categoryName: e.target.value })}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all" className="bg-card text-foreground">
            All Categories
          </option>
          {categories.map((c) => (
            <option
              key={typeof c === "string" ? c : c.id}
              value={typeof c === "string" ? c : c.id}
              className="bg-card text-foreground"
            >
              {typeof c === "string" ? c : c.name}
            </option>
          ))}
        </select>

        {/* Sort By */}
        <select
          aria-label="Sort transactions"
          value={filters.sortBy}
          onChange={(e) =>
            onFilterChange({
              sortBy: e.target.value as TransactionFilterState["sortBy"],
            })
          }
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="date_desc" className="bg-card text-foreground">
            Date: Newest first
          </option>
          <option value="date_asc" className="bg-card text-foreground">
            Date: Oldest first
          </option>
          <option value="amount_desc" className="bg-card text-foreground">
            Amount: Highest first
          </option>
          <option value="amount_asc" className="bg-card text-foreground">
            Amount: Lowest first
          </option>
        </select>
      </div>

      {/* Type Filter Pills & Reset */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/60">
        <div className="flex flex-wrap items-center gap-1 text-xs">
          {(["all", "expense", "receipt", "transfer"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => onFilterChange({ kind: k })}
              className={`rounded-md px-2.5 py-1 font-medium capitalize transition-colors ${
                filters.kind === k
                  ? "bg-kivo-primary text-white"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {k === "all" ? "All Types" : k}
            </button>
          ))}
        </div>

        {isFiltered && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={onReset}
            className="text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <RotateCcw className="size-3" />
            <span>Reset Filters</span>
          </Button>
        )}
      </div>
    </div>
  );
}
