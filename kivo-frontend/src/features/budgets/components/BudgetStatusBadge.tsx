import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, AlertCircle, ShieldAlert } from "lucide-react";
import type { BudgetStatus } from "../types";

interface BudgetStatusBadgeProps {
  status: BudgetStatus;
  className?: string;
}

export function BudgetStatusBadge({ status, className }: BudgetStatusBadgeProps) {
  switch (status) {
    case "exceeded":
      return (
        <Badge
          variant="outline"
          className={`border-destructive/40 text-destructive bg-destructive/10 gap-1 text-[10px] font-medium py-0 px-1.5 ${className || ""}`}
        >
          <ShieldAlert className="size-3 text-destructive" />
          <span>Over Budget</span>
        </Badge>
      );
    case "full":
      return (
        <Badge
          variant="outline"
          className={`border-blue-400 text-blue-900 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 gap-1 text-[10px] font-medium py-0 px-1.5 ${className || ""}`}
        >
          <AlertCircle className="size-3 text-blue-600" />
          <span>100% Utilized</span>
        </Badge>
      );
    case "warning":
      return (
        <Badge
          variant="outline"
          className={`border-amber-400 text-amber-900 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 gap-1 text-[10px] font-medium py-0 px-1.5 ${className || ""}`}
        >
          <AlertTriangle className="size-3 text-amber-600" />
          <span>Approaching Limit (80%+)</span>
        </Badge>
      );
    case "normal":
    default:
      return (
        <Badge
          variant="outline"
          className={`border-emerald-300 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 gap-1 text-[10px] font-medium py-0 px-1.5 ${className || ""}`}
        >
          <CheckCircle2 className="size-3 text-emerald-600" />
          <span>On Track</span>
        </Badge>
      );
  }
}
