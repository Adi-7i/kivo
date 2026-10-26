import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function FinancialSummaryCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "min-h-40 min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5 space-y-3",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="size-6 rounded-md" />
      </div>
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-2.5 w-40" />
    </div>
  );
}

export function TransactionRowSkeleton() {
  return (
    <div className="flex items-center justify-between p-3 border-b border-border/60">
      <div className="flex items-center gap-3">
        <Skeleton className="size-8 rounded-lg" />
        <div className="space-y-1">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      </div>
      <div className="text-right space-y-1">
        <Skeleton className="h-3.5 w-16 ml-auto" />
        <Skeleton className="h-2.5 w-12 ml-auto" />
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-7 w-28 rounded-md" />
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}
