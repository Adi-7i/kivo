import * as React from "react";

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Loading analytics dashboard">
      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 bg-card border border-border/50 rounded-xl p-3 space-y-2">
            <div className="h-3 w-16 bg-muted rounded-sm" />
            <div className="h-6 w-24 bg-muted/80 rounded-md" />
            <div className="h-2 w-20 bg-muted/40 rounded-sm" />
          </div>
        ))}
      </div>

      {/* Comparison Skeleton */}
      <div className="h-32 bg-card border border-border/50 rounded-2xl p-5" />

      {/* Charts Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-80 bg-card border border-border/50 rounded-2xl p-5" />
        <div className="h-80 bg-card border border-border/50 rounded-2xl p-5" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-80 bg-card border border-border/50 rounded-2xl p-5" />
        <div className="h-80 bg-card border border-border/50 rounded-2xl p-5" />
      </div>
    </div>
  );
}
