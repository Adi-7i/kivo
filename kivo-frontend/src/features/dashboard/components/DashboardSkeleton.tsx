import {
  FinancialSummaryCardSkeleton,
  ChartSkeleton,
} from "@/features/shared-financial/FinancialSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading overview">
      <span className="sr-only">Loading your overview…</span>
      <div className="space-y-4">
        {/* 2 Hero Card Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
        </div>
        {/* Header Skeleton */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-48" />
        </div>
        {/* 6 Secondary Metric Skeletons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <FinancialSummaryCardSkeleton key={i} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ChartSkeleton />
        </div>
        <ChartSkeleton />
      </div>
    </div>
  );
}

