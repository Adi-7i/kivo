import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FundingStatus } from "../types";
import { CheckCircle2, Clock, AlertCircle, RefreshCw, Archive } from "lucide-react";

interface FundingStatusBadgeProps {
  status: FundingStatus;
  className?: string;
  showIcon?: boolean;
}

export function FundingStatusBadge({
  status,
  className,
  showIcon = true,
}: FundingStatusBadgeProps) {
  switch (status) {
    case "active":
      return (
        <Badge
          variant="outline"
          className={cn(
            "border-emerald-600/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-medium text-xs gap-1",
            className
          )}
        >
          {showIcon && <Clock className="size-3 text-emerald-600 dark:text-emerald-400" />}
          <span>Active (Allocating)</span>
        </Badge>
      );
    case "exhausted":
      return (
        <Badge
          variant="outline"
          className={cn(
            "border-neutral-400/40 bg-neutral-100 text-neutral-700 dark:bg-neutral-800/40 dark:text-neutral-300 font-medium text-xs gap-1",
            className
          )}
        >
          {showIcon && <Archive className="size-3 text-neutral-500" />}
          <span>Exhausted</span>
        </Badge>
      );
    case "partially_allocated":
      return (
        <Badge
          variant="outline"
          className={cn(
            "border-amber-600/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 font-medium text-xs gap-1",
            className
          )}
        >
          {showIcon && <CheckCircle2 className="size-3 text-amber-600 dark:text-amber-400" />}
          <span>Partially Allocated</span>
        </Badge>
      );
    case "unresolved":
      return (
        <Badge
          variant="outline"
          className={cn(
            "border-orange-600/30 bg-orange-500/10 text-orange-800 dark:text-orange-300 font-medium text-xs gap-1",
            className
          )}
        >
          {showIcon && <AlertCircle className="size-3 text-orange-600 dark:text-orange-400" />}
          <span>Unresolved Allocation</span>
        </Badge>
      );
    case "corrected":
      return (
        <Badge
          variant="outline"
          className={cn(
            "border-blue-600/30 bg-blue-500/10 text-blue-800 dark:text-blue-300 font-medium text-xs gap-1",
            className
          )}
        >
          {showIcon && <RefreshCw className="size-3 text-blue-600 dark:text-blue-400" />}
          <span>Corrected History</span>
        </Badge>
      );
  }
}
