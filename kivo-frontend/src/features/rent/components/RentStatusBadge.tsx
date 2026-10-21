import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertTriangle, AlertCircle, FastForward } from "lucide-react";
import type { RentObligationStatus } from "../types";

interface RentStatusBadgeProps {
  status: RentObligationStatus;
  className?: string;
}

export function RentStatusBadge({ status, className }: RentStatusBadgeProps) {
  switch (status) {
    case "paid":
      return (
        <Badge
          variant="outline"
          className={`border-emerald-300 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 gap-1 text-[10px] font-medium py-0 px-1.5 ${className || ""}`}
        >
          <CheckCircle2 className="size-3 text-emerald-600" />
          <span>Paid</span>
        </Badge>
      );
    case "partial":
      return (
        <Badge
          variant="outline"
          className={`border-amber-300 text-amber-800 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 gap-1 text-[10px] font-medium py-0 px-1.5 ${className || ""}`}
        >
          <Clock className="size-3 text-amber-600" />
          <span>Partially Paid</span>
        </Badge>
      );
    case "overdue":
      return (
        <Badge
          variant="outline"
          className={`border-destructive/40 text-destructive bg-destructive/10 gap-1 text-[10px] font-medium py-0 px-1.5 ${className || ""}`}
        >
          <AlertTriangle className="size-3 text-destructive" />
          <span>Overdue</span>
        </Badge>
      );
    case "due":
      return (
        <Badge
          variant="outline"
          className={`border-amber-400 text-amber-900 bg-amber-100/70 dark:bg-amber-950/60 dark:text-amber-200 gap-1 text-[10px] font-medium py-0 px-1.5 ${className || ""}`}
        >
          <AlertCircle className="size-3 text-amber-600" />
          <span>Due Today</span>
        </Badge>
      );
    case "skipped":
      return (
        <Badge
          variant="secondary"
          className={`text-muted-foreground gap-1 text-[10px] font-normal py-0 px-1.5 ${className || ""}`}
        >
          <FastForward className="size-3 text-muted-foreground" />
          <span>Skipped</span>
        </Badge>
      );
    case "upcoming":
    default:
      return (
        <Badge
          variant="outline"
          className={`border-blue-300 text-blue-800 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 gap-1 text-[10px] font-medium py-0 px-1.5 ${className || ""}`}
        >
          <Clock className="size-3 text-blue-600" />
          <span>Upcoming</span>
        </Badge>
      );
  }
}
