"use client";

import * as React from "react";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Store, Layers, Users, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { CategorySpendingItem, SpendingDistribution } from "../types";

interface ReportDetailPanelProps {
  categories: CategorySpendingItem[];
  distribution: SpendingDistribution;
  selectedCategory?: CategorySpendingItem | null;
  onClearCategory?: () => void;
  className?: string;
}

export function ReportDetailPanel({
  categories,
  distribution,
  selectedCategory,
  onClearCategory,
  className,
}: ReportDetailPanelProps) {
  const [expandedSection, setExpandedSection] = React.useState<
    "categories" | "merchants" | "people"
  >("categories");

  return (
    <div
      className={`rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4 ${className || ""}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="font-heading font-bold text-base text-foreground tracking-tight">
            Detailed Expenditure Breakdown
          </h3>
          <p className="text-xs text-muted-foreground">
            Drill down into category performance, merchant allocations, and split partner totals
          </p>
        </div>

        <Link
          href="/transactions"
          className="inline-flex items-center gap-1 text-xs font-medium text-kivo-primary hover:text-kivo-brand-dark self-start sm:self-auto"
        >
          <span>View All Transactions</span>
          <ExternalLink className="size-3" />
        </Link>
      </div>

      {/* Selected Category Highlight Banner */}
      {selectedCategory && (
        <div className="rounded-lg border border-kivo-primary/30 bg-kivo-primary/5 p-3 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span
              className="size-3 rounded-full"
              style={{ backgroundColor: selectedCategory.color }}
            />
            <span className="font-semibold text-foreground">
              Drilling down into: {selectedCategory.category}
            </span>
            <span className="text-muted-foreground font-mono">
              ({selectedCategory.percentage}% of cycle spending)
            </span>
          </div>

          {onClearCategory && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearCategory}
              className="h-6 text-xs text-muted-foreground hover:text-foreground px-2"
            >
              Clear Focus
            </Button>
          )}
        </div>
      )}

      {/* Accordion / Tabbed Detail Sections */}
      <div className="space-y-2 pt-1">
        {/* Section 1: Categories Breakdown */}
        <div className="rounded-xl border border-border/70 overflow-hidden">
          <button
            type="button"
            onClick={() =>
              setExpandedSection(expandedSection === "categories" ? "merchants" : "categories")
            }
            className="w-full flex items-center justify-between p-3.5 bg-muted/20 hover:bg-muted/40 text-left transition-colors text-xs font-semibold text-foreground"
          >
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-kivo-primary" />
              <span>Category Itemized Summaries</span>
              <span className="text-[10px] text-muted-foreground font-mono">
                ({categories.length} entries)
              </span>
            </div>
            {expandedSection === "categories" ? (
              <ChevronDown className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground" />
            )}
          </button>

          {expandedSection === "categories" && (
            <div className="overflow-x-auto min-w-0">
              <div className="p-3.5 divide-y divide-border/40 text-xs min-w-[320px]">
                <div className="grid grid-cols-12 pb-2 text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                  <span className="col-span-5">Category</span>
                  <span className="col-span-2 text-right">Volume</span>
                  <span className="col-span-2 text-right">Share</span>
                  <span className="col-span-3 text-right">Total Spent</span>
                </div>
                {categories.map((c) => (
                  <div key={c.slug} className="grid grid-cols-12 py-2 items-center">
                    <div className="col-span-5 flex items-center gap-2 min-w-0">
                      <span
                        className="size-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="font-medium text-foreground truncate">{c.category}</span>
                    </div>
                    <span className="col-span-2 text-right text-muted-foreground font-mono">
                      {c.transactionCount}
                    </span>
                    <span className="col-span-2 text-right font-mono font-medium text-foreground">
                      {c.percentage}%
                    </span>
                    <div className="col-span-3 text-right">
                      <MoneyAmount paise={c.amountPaise} size="sm" variant="expense" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Merchants Breakdown */}
        <div className="rounded-xl border border-border/70 overflow-hidden">
          <button
            type="button"
            onClick={() =>
              setExpandedSection(expandedSection === "merchants" ? "categories" : "merchants")
            }
            className="w-full flex items-center justify-between p-3.5 bg-muted/20 hover:bg-muted/40 text-left transition-colors text-xs font-semibold text-foreground"
          >
            <div className="flex items-center gap-2">
              <Store className="size-4 text-kivo-primary" />
              <span>Top Merchant & Vendor Allocations</span>
              <span className="text-[10px] text-muted-foreground font-mono">
                ({distribution.byMerchant.length} merchants)
              </span>
            </div>
            {expandedSection === "merchants" ? (
              <ChevronDown className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground" />
            )}
          </button>

          {expandedSection === "merchants" && (
            <div className="overflow-x-auto min-w-0">
              <div className="p-3.5 divide-y divide-border/40 text-xs min-w-[320px]">
                <div className="grid grid-cols-12 pb-2 text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                  <span className="col-span-5">Merchant / Place</span>
                  <span className="col-span-2 text-right">Transactions</span>
                  <span className="col-span-2 text-right">Share</span>
                  <span className="col-span-3 text-right">Total Spent</span>
                </div>
                {distribution.byMerchant.map((m) => (
                  <div key={m.name} className="grid grid-cols-12 py-2 items-center">
                    <span className="col-span-5 font-medium text-foreground truncate">
                      {m.name}
                    </span>
                    <span className="col-span-2 text-right text-muted-foreground font-mono">
                      {m.count}
                    </span>
                    <span className="col-span-2 text-right font-mono font-medium text-foreground">
                      {m.percentage}%
                    </span>
                    <div className="col-span-3 text-right">
                      <MoneyAmount paise={m.amountPaise} size="sm" variant="expense" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Person / Split Partner Breakdown */}
        <div className="rounded-xl border border-border/70 overflow-hidden">
          <button
            type="button"
            onClick={() =>
              setExpandedSection(expandedSection === "people" ? "categories" : "people")
            }
            className="w-full flex items-center justify-between p-3.5 bg-muted/20 hover:bg-muted/40 text-left transition-colors text-xs font-semibold text-foreground"
          >
            <div className="flex items-center gap-2">
              <Users className="size-4 text-kivo-primary" />
              <span>Person & Roommate Related Expenses</span>
              <span className="text-[10px] text-muted-foreground font-mono">
                ({distribution.byPerson.length} partners)
              </span>
            </div>
            {expandedSection === "people" ? (
              <ChevronDown className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground" />
            )}
          </button>

          {expandedSection === "people" && (
            <div className="overflow-x-auto min-w-0">
              <div className="p-3.5 divide-y divide-border/40 text-xs min-w-[320px]">
                <div className="grid grid-cols-12 pb-2 text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                  <span className="col-span-5">Attribution Entity</span>
                  <span className="col-span-2 text-right">Activities</span>
                  <span className="col-span-2 text-right">Share</span>
                  <span className="col-span-3 text-right">User&apos;s Share</span>
                </div>
                {distribution.byPerson.map((p) => (
                  <div key={p.name} className="grid grid-cols-12 py-2 items-center">
                    <span className="col-span-5 font-medium text-foreground truncate">
                      {p.name}
                    </span>
                    <span className="col-span-2 text-right text-muted-foreground font-mono">
                      {p.count}
                    </span>
                    <span className="col-span-2 text-right font-mono font-medium text-foreground">
                      {p.percentage}%
                    </span>
                    <div className="col-span-3 text-right">
                      <MoneyAmount paise={p.amountPaise} size="sm" variant="expense" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
