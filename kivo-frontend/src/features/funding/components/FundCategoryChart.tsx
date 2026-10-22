"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { FinancialEmptyState } from "@/features/shared-financial/FinancialEmptyState";
import { Tags, Inbox } from "lucide-react";
import type { FundCategoryAttribution } from "../types";

interface FundCategoryChartProps {
  categories: FundCategoryAttribution[];
  className?: string;
}

export function FundCategoryChart({ categories, className }: FundCategoryChartProps) {
  if (categories.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Tags className="size-4 text-kivo-primary" />
            <CardTitle className="text-base font-bold font-heading">
              Attributed Expense Categories
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Breakdown of personal consumption by category.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FinancialEmptyState
            title="No Categorized Expenses Yet"
            description="This funding batch has not yet been attributed to any personal expenditure categories."
            icon={<Inbox className="size-8 text-muted-foreground" />}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Tags className="size-4 text-kivo-primary" />
          <CardTitle className="text-base font-bold font-heading">
            Attributed Expense Categories
          </CardTitle>
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          Classification of personal expenditures attributed to this funding source.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-1">
        {categories.map((cat) => {
          const barColor = cat.color || "var(--color-kivo-primary)";
          return (
            <div key={cat.categoryName} className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full inline-block shrink-0"
                    style={{ backgroundColor: barColor }}
                  />
                  {cat.categoryName}
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {cat.percentage}% of Inflow
                  </span>
                  <MoneyAmount
                    paise={cat.amountPaise}
                    size="xs"
                    tabular
                    className="font-bold text-foreground"
                  />
                </div>
              </div>

              {/* Accessible horizontal progress bar */}
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(0, cat.percentage))}%`,
                    backgroundColor: barColor,
                  }}
                  role="progressbar"
                  aria-valuenow={cat.percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${cat.categoryName}: ${cat.percentage}%`}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
