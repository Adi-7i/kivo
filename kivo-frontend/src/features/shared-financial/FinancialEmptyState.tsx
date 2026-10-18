import * as React from "react";
import { cn } from "@/lib/utils";

interface FinancialEmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  secondaryNotice?: string;
}

export function FinancialEmptyState({
  icon,
  title,
  description,
  action,
  secondaryNotice,
  className,
  ...props
}: FinancialEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-border bg-card/60 space-y-3",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground mb-1">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {action && <div className="pt-2">{action}</div>}

      {secondaryNotice && (
        <p className="text-[10px] text-muted-foreground/80 pt-1">
          {secondaryNotice}
        </p>
      )}
    </div>
  );
}
