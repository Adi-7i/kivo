import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import type { CategoryDistribution } from "../types";

interface CategoryBreakdownCardProps {
  categories: CategoryDistribution[];
  className?: string;
}

export function CategoryBreakdownCard({ categories, className }: CategoryBreakdownCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold font-heading">Expense by Category</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Monthly expenditure distribution by classification.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3.5 pt-1">
        {categories.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            No categorized expenses recorded for this period.
          </p>
        ) : (
          categories.map((cat) => (
            <div key={cat.categoryName} className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">{cat.categoryName}</span>
                <div className="flex items-center gap-2">
                  {cat.percentage !== undefined && (
                    <span className="text-[11px] text-muted-foreground">{cat.percentage}%</span>
                  )}
                  <MoneyAmount paise={cat.amountPaise} size="xs" tabular />
                </div>
              </div>

              {/* Visual progress bar */}
              {cat.percentage !== undefined && (
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.max(0, cat.percentage))}%`,
                      backgroundColor: cat.color || "var(--color-kivo-primary)",
                    }}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
