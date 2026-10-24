import * as React from "react";
import { formatInr, type FormatInrOptions } from "@/lib/formatters/currency";
import { cn } from "@/lib/utils";

export interface MoneyAmountProps extends FormatInrOptions {
  paise: number;
  variant?: "default" | "income" | "expense" | "transfer" | "neutral" | "reserved";
  size?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl";
  className?: string;
  tabular?: boolean;
}

const variantClasses = {
  default: "text-foreground",
  income: "text-finance-income",
  expense: "text-finance-expense",
  transfer: "text-finance-transfer",
  neutral: "text-finance-neutral",
  reserved: "text-finance-reserved",
};

const sizeClasses = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg font-semibold",
  xl: "text-xl font-bold tracking-tight",
  "2xl": "text-2xl font-bold tracking-tight sm:text-3xl",
  "3xl": "text-3xl font-extrabold tracking-tight sm:text-4xl",
};

export function MoneyAmount({
  paise,
  variant = "default",
  size = "base",
  showSymbol = true,
  showSign = false,
  className,
  tabular = true,
}: MoneyAmountProps) {
  // Ensure we safely format valid integer paise
  const formatted = React.useMemo(() => {
    try {
      return formatInr(paise, { showSymbol, showSign });
    } catch {
      return "Amount unavailable";
    }
  }, [paise, showSymbol, showSign]);

  return (
    <span
      className={cn(
        "inline-flex items-baseline font-medium",
        tabular && "font-tabular",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {formatted}
    </span>
  );
}
