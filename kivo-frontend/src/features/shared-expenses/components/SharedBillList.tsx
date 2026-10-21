"use client";

import * as React from "react";
import { SharedBillCard } from "./SharedBillCard";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, PlusCircle, Receipt, RotateCcw, ArrowUpDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { SharedBillEntity } from "../types";

interface SharedBillListProps {
  bills: SharedBillEntity[];
  onCreateBill?: () => void;
}

type FilterOption = "all" | "user_paid" | "friend_paid" | "unsettled" | "settled";
type SortOption = "date_desc" | "date_asc" | "amount_desc" | "user_share_desc";

export function SharedBillList({ bills, onCreateBill }: SharedBillListProps) {
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<FilterOption>("all");
  const [sort, setSort] = React.useState<SortOption>("date_desc");

  // Filtering
  const filtered = React.useMemo(() => {
    return bills.filter((bill) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        bill.title.toLowerCase().includes(q) ||
        bill.category.toLowerCase().includes(q) ||
        (bill.merchant && bill.merchant.toLowerCase().includes(q)) ||
        bill.shares.some((s) => s.displayName.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      switch (filter) {
        case "user_paid":
          return bill.payerContactId === null;
        case "friend_paid":
          return bill.payerContactId !== null;
        case "unsettled":
          return bill.status === "unsettled" || bill.status === "partially_settled";
        case "settled":
          return bill.status === "all_settled";
        case "all":
        default:
          return true;
      }
    });
  }, [bills, search, filter]);

  // Sorting
  const sorted = React.useMemo(() => {
    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "date_asc":
          return new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime();
        case "amount_desc":
          return b.amountPaise - a.amountPaise;
        case "user_share_desc":
          return b.userSharePaise - a.userSharePaise;
        case "date_desc":
        default:
          return new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime();
      }
    });
  }, [filtered, sort]);

  // Aggregates
  const totalGrossPaise = React.useMemo(() => {
    return bills.reduce((sum, b) => sum + b.amountPaise, 0);
  }, [bills]);

  const totalUserSharePaise = React.useMemo(() => {
    return bills.reduce((sum, b) => sum + b.userSharePaise, 0);
  }, [bills]);

  return (
    <div className="space-y-4">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bills by title, merchant, or participant..."
            className="pl-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Sort selector */}
          <div className="flex items-center gap-1.5 border border-border/80 rounded-md px-2.5 py-1.5 bg-card text-xs">
            <ArrowUpDown className="size-3.5 text-muted-foreground" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="bg-transparent text-xs text-foreground focus:outline-hidden cursor-pointer"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="amount_desc">Highest Gross Bill</option>
              <option value="user_share_desc">Highest Your Share</option>
            </select>
          </div>

          {onCreateBill && (
            <Button
              onClick={onCreateBill}
              size="sm"
              className="bg-kivo-primary hover:bg-kivo-brand-dark text-white gap-1.5 text-xs font-medium"
            >
              <PlusCircle className="size-3.5" />
              <span>Create Shared Bill</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {(
          [
            { id: "all", label: "All Bills" },
            { id: "user_paid", label: "Paid by You" },
            { id: "friend_paid", label: "Paid by Friend" },
            { id: "unsettled", label: "Unsettled" },
            { id: "settled", label: "Settled" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 rounded-full font-medium transition-colors shrink-0 ${
              filter === tab.id
                ? "bg-kivo-primary text-white"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Empty State */}
      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-card/40 p-8 text-center space-y-3">
          <div className="size-10 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
            <Receipt className="size-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">No shared bills found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {search
                ? `No shared bills match "${search}". Try clearing your search query or switching filters.`
                : "No shared bills have been recorded in this view. Split group dinners, groceries, or flat bills with friends."}
            </p>
          </div>
          {(search || filter !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setFilter("all");
              }}
              className="text-xs gap-1.5"
            >
              <RotateCcw className="size-3.5" />
              Reset Filters
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-xl border border-border/80 bg-card overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/60 bg-muted/30 text-muted-foreground font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Bill Title & Category</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Paid By</th>
                  <th className="py-3 px-4 text-right">Gross Total</th>
                  <th className="py-3 px-4 text-right">Your Personal Share</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {sorted.map((bill) => (
                  <tr key={bill.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-semibold text-foreground block">{bill.title}</span>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span>{bill.category}</span>
                          {bill.merchant && (
                            <>
                              <span>&bull;</span>
                              <span>{bill.merchant}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-muted-foreground">
                      {bill.effectiveDate}
                    </td>

                    <td className="py-3.5 px-4 text-foreground font-medium">{bill.payerName}</td>

                    <td className="py-3.5 px-4 text-right">
                      <MoneyAmount paise={bill.amountPaise} size="sm" variant="default" />
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <MoneyAmount paise={bill.userSharePaise} size="sm" variant="expense" />
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge
                        variant="outline"
                        className={`text-[10px] py-0 px-1.5 font-normal capitalize ${
                          bill.status === "all_settled"
                            ? "border-emerald-300 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40"
                            : bill.status === "partially_settled"
                              ? "border-amber-300 text-amber-800 bg-amber-50 dark:bg-amber-950/40"
                              : "border-blue-300 text-blue-800 bg-blue-50 dark:bg-blue-950/40"
                        }`}
                      >
                        {bill.status.replace("_", " ")}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/shared-expenses/${bill.id}`}
                        className="inline-flex items-center gap-1 text-kivo-secondary hover:text-kivo-brand-dark dark:hover:text-kivo-sage font-medium"
                      >
                        <span>View</span>
                        <ChevronRight className="size-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Grid View */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {sorted.map((bill) => (
              <SharedBillCard key={bill.id} bill={bill} />
            ))}
          </div>
        </>
      )}

      {/* Aggregate Financial Invariant Callout */}
      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <span className="font-semibold text-foreground">Shared Expense Recognition Law</span>
          <p className="text-muted-foreground text-[11px]">
            When you pay a bill, the gross amount is not your personal expense. Only your personal
            share is recognized as an expense; friends&apos; shares are receivables.
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Cumulative Gross Bills:</span>
            <MoneyAmount paise={totalGrossPaise} size="sm" variant="default" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Your Expense Shares:</span>
            <MoneyAmount paise={totalUserSharePaise} size="sm" variant="expense" />
          </div>
        </div>
      </div>
    </div>
  );
}
