import {
  FinancialSummaryCardSkeleton,
  ChartSkeleton,
} from "@/features/shared-financial/FinancialSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading overview">
      <span className="sr-only">Loading your overview…</span>
      <div className="space-y-3">
        <Skeleton className="h-4 w-48" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
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
