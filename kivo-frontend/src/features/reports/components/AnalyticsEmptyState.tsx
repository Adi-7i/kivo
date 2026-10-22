import * as React from "react";
import { BarChart3, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AnalyticsEmptyStateProps {
  onResetFilters?: () => void;
  message?: string;
}

export function AnalyticsEmptyState({
  onResetFilters,
  message = "No transactions found matching the selected period and filter parameters.",
}: AnalyticsEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-8 sm:p-12 text-center space-y-4 bg-card/40">
      <div className="size-12 rounded-xl bg-kivo-primary/10 text-kivo-primary flex items-center justify-center mx-auto shadow-2xs">
        <BarChart3 className="size-6" />
      </div>

      <div className="space-y-1 max-w-sm mx-auto">
        <h3 className="text-base font-heading font-bold text-foreground">
          No Analytics Data Available
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{message}</p>
      </div>

      {onResetFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={onResetFilters}
          className="gap-1.5 text-xs text-kivo-primary hover:text-kivo-brand-dark"
        >
          <RotateCcw className="size-3.5" />
          <span>Reset Filters</span>
        </Button>
      )}
    </div>
  );
}
