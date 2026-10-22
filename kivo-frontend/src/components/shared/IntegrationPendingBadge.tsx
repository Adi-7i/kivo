import * as React from "react";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

interface IntegrationPendingBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "badge" | "banner";
  message?: string;
}

export function IntegrationPendingBadge({
  variant = "badge",
  message = "Backend integration pending",
  className,
  ...props
}: IntegrationPendingBadgeProps) {
  if (variant === "banner") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "flex items-center gap-2.5 rounded-lg border border-amber-600/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-900 dark:text-amber-200",
          className
        )}
        {...props}
      >
        <Clock className="size-4 shrink-0 text-amber-700 dark:text-amber-400" />
        <span>{message}</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-amber-600/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:text-amber-300",
        className
      )}
      {...props}
    >
      <Clock className="size-3 shrink-0 text-amber-700 dark:text-amber-400" />
      <span>{message}</span>
    </div>
  );
}
