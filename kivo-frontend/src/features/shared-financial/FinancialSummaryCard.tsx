import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MoneyAmount } from "./MoneyAmount";
import { cn } from "@/lib/utils";

export interface FinancialSummaryCardProps {
  title: string;
  amountPaise: number;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: "default" | "safe-to-spend" | "expense" | "income" | "reserved" | "liability";
  className?: string;
}

const variantCardStyles = {
  default: "border-border/80 bg-card/90",
  "safe-to-spend": "border-kivo-primary/30 bg-kivo-primary/5 dark:bg-kivo-primary/10",
  expense: "border-destructive/20 bg-destructive/5 dark:bg-destructive/10",
  income: "border-emerald-600/25 bg-emerald-500/5 dark:bg-emerald-500/10",
  reserved: "border-amber-600/25 bg-amber-500/5 dark:bg-amber-500/10",
  liability: "border-orange-600/25 bg-orange-500/5 dark:bg-orange-500/10",
};

const variantMoneyStyles: Record<
  string,
  "default" | "income" | "expense" | "transfer" | "neutral" | "reserved"
> = {
  default: "default",
  "safe-to-spend": "income",
  expense: "expense",
  income: "income",
  reserved: "reserved",
  liability: "expense",
};

export function FinancialSummaryCard({
  title,
  amountPaise,
  subtitle,
  icon,
  variant = "default",
  className,
}: FinancialSummaryCardProps) {
  return (
    <Card
      className={cn(
        "relative min-h-36 min-w-0 overflow-hidden py-0 shadow-card hover:shadow-card-hover transition-all duration-150 rounded-2xl",
        variantCardStyles[variant],
        className
      )}
    >
      <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-3">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            {title}
          </span>
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-background/80 border border-border/60 shadow-2xs text-muted-foreground">
            {icon}
          </div>
        </div>

        <div className="space-y-1">
          <MoneyAmount
            paise={amountPaise}
            size="2xl"
            className="max-w-full break-all text-xl sm:text-2xl font-bold font-tabular tracking-tight"
            variant={variantMoneyStyles[variant]}
          />
          {subtitle && (
            <p className="text-[11px] text-muted-foreground/80 leading-snug">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

