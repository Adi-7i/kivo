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
  default: "border-border/80 bg-card",
  "safe-to-spend": "border-kivo-primary/30 bg-kivo-primary/5 dark:bg-kivo-primary/10",
  expense: "border-destructive/20 bg-destructive/5 dark:bg-destructive/10",
  income: "border-emerald-600/20 bg-emerald-500/5 dark:bg-emerald-500/10",
  reserved: "border-amber-600/20 bg-amber-500/5 dark:bg-amber-500/10",
  liability: "border-orange-600/20 bg-orange-500/5 dark:bg-orange-500/10",
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
        "relative overflow-hidden transition-all duration-200 hover:shadow-xs",
        variantCardStyles[variant],
        className
      )}
    >
      <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </span>
          <div className="flex size-7 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
            {icon}
          </div>
        </div>

        <div className="space-y-0.5">
          <MoneyAmount paise={amountPaise} size="2xl" variant={variantMoneyStyles[variant]} />
          {subtitle && (
            <p className="text-[11px] text-muted-foreground leading-tight">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
