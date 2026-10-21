import * as React from "react";

export function BudgetSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Loading budgets">
      {/* Overview Card Skeleton */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-5">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-5 w-48 bg-muted rounded-md" />
            <div className="h-3 w-64 bg-muted/60 rounded-md" />
          </div>
          <div className="h-8 w-32 bg-muted rounded-md" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="h-20 bg-muted/40 rounded-xl" />
          <div className="h-20 bg-muted/40 rounded-xl" />
          <div className="h-20 bg-muted/40 rounded-xl" />
        </div>

        <div className="h-3 w-full bg-muted/50 rounded-full" />
      </div>

      {/* Category List Skeleton */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div className="h-5 w-40 bg-muted rounded-md" />
          <div className="h-8 w-48 bg-muted rounded-md" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <div className="h-44 bg-card border border-border/40 rounded-xl p-4" />
          <div className="h-44 bg-card border border-border/40 rounded-xl p-4" />
          <div className="h-44 bg-card border border-border/40 rounded-xl p-4" />
        </div>
      </div>
    </div>
  );
}
