import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}

export function SectionHeader({
  title,
  description,
  actions,
  badge,
  className,
  ...props
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2",
        className
      )}
      {...props}
    >
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl font-heading">
            {title}
          </h2>
          {badge}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>

      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
