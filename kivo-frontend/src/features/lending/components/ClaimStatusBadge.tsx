import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle, XCircle } from "lucide-react";
import type { ClaimStatus } from "../types";

interface ClaimStatusBadgeProps {
  status: ClaimStatus;
  className?: string;
}

export function ClaimStatusBadge({ status, className }: ClaimStatusBadgeProps) {
  switch (status) {
    case "settled":
      return (
        <Badge
          variant="outline"
          className={`border-emerald-300 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 gap-1 text-[10px] font-medium py-0 px-1.5 ${className || ""}`}
        >
          <CheckCircle2 className="size-3 text-emerald-600" />
          <span>Settled</span>
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
    case "cancelled":
      return (
        <Badge
          variant="outline"
          className={`border-destructive/30 text-destructive bg-destructive/10 gap-1 text-[10px] font-medium py-0 px-1.5 ${className || ""}`}
        >
          <XCircle className="size-3 text-destructive" />
          <span>Cancelled</span>
        </Badge>
      );
    case "open":
    default:
      return (
        <Badge
          variant="outline"
          className={`border-blue-300 text-blue-800 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 gap-1 text-[10px] font-medium py-0 px-1.5 ${className || ""}`}
        >
          <AlertCircle className="size-3 text-blue-600" />
          <span>Active Claim</span>
        </Badge>
      );
  }
}
