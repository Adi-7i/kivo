import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { FundingProgressIndicator } from "./FundingProgressIndicator";
import { PieChart as PieChartIcon } from "lucide-react";
import type { FundAllocationBreakdown } from "../types";

interface AllocationBreakdownProps {
  breakdown: FundAllocationBreakdown;
  className?: string;
}

export function AllocationBreakdown({ breakdown, className }: AllocationBreakdownProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-1.5 mb-0.5">
          <PieChartIcon className="size-4 text-kivo-primary" />
          <CardTitle className="text-base font-bold font-heading">Allocation Composition</CardTitle>
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          Proportional division of original funds across personal consumption, receivables, and
          liquid remainder.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Large Stacked Progress Bar */}
        <div className="space-y-2">
          <FundingProgressIndicator
            originalAmountPaise={breakdown.originalAmountPaise}
            spentPaise={breakdown.spentPaise}
            lentPaise={breakdown.lentPaise}
            remainingPaise={breakdown.remainingPaise}
            showLabels
          />
        </div>

        {/* 3 Detailed Breakdown Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Spent */}
          <div className="rounded-lg border border-border p-3 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-destructive flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-destructive inline-block" />
                Personal Spent
              </span>
              <span className="font-bold text-foreground">{breakdown.spentPercentage}%</span>
            </div>
            <MoneyAmount
              paise={breakdown.spentPaise}
              size="sm"
              tabular
              className="font-bold text-foreground"
            />
            <p className="text-[10px] text-muted-foreground">Direct personal consumption</p>
          </div>

          {/* Lent */}
          <div className="rounded-lg border border-border p-3 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-blue-600 flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-blue-600 inline-block" />
                Lent Asset
              </span>
              <span className="font-bold text-foreground">{breakdown.lentPercentage}%</span>
            </div>
            <MoneyAmount
              paise={breakdown.lentPaise}
              size="sm"
              tabular
              className="font-bold text-foreground"
            />
            <p className="text-[10px] text-muted-foreground">Receivable asset lent to friends</p>
          </div>

          {/* Remaining */}
          <div className="rounded-lg border border-border p-3 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-kivo-primary flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-kivo-primary inline-block" />
                Remaining
              </span>
              <span className="font-bold text-foreground">{breakdown.remainingPercentage}%</span>
            </div>
            <MoneyAmount
              paise={breakdown.remainingPaise}
              size="sm"
              tabular
              className="font-bold text-foreground"
            />
            <p className="text-[10px] text-muted-foreground">Unallocated liquid reserve</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
