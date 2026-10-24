import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { type TransactionKind, TRANSACTION_KIND_LABELS } from "../transactions/types";
import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  Coins,
  RotateCcw,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TransactionTypeBadgeProps {
  kind: TransactionKind;
  className?: string;
  showIcon?: boolean;
}

const badgeConfig: Partial<
  Record<
    TransactionKind,
    {
      icon: React.ReactNode;
      classes: string;
    }
  >
> = {
  expense: {
    icon: <ArrowUpRight className="size-3 text-finance-expense shrink-0" />,
    classes: "border-finance-expense/30 bg-finance-expense/10 text-finance-expense",
  },
  receipt: {
    icon: <ArrowDownLeft className="size-3 text-finance-income shrink-0" />,
    classes: "border-finance-income/30 bg-finance-income/10 text-finance-income",
  },
  transfer: {
    icon: <ArrowRightLeft className="size-3 text-finance-transfer shrink-0" />,
    classes: "border-finance-transfer/30 bg-finance-transfer/10 text-finance-transfer",
  },
  opening: {
    icon: <Coins className="size-3 text-kivo-primary shrink-0" />,
    classes: "border-kivo-primary/30 bg-kivo-primary/10 text-kivo-primary",
  },
  refund: {
    icon: <RotateCcw className="size-3 text-cyan-600 shrink-0" />,
    classes: "border-cyan-600/30 bg-cyan-500/10 text-cyan-800 dark:text-cyan-300",
  },
  reversal: {
    icon: <History className="size-3 text-muted-foreground shrink-0" />,
    classes: "border-muted-foreground/30 bg-muted text-muted-foreground",
  },
};

export function TransactionTypeBadge({
  kind,
  className,
  showIcon = true,
}: TransactionTypeBadgeProps) {
  const config = badgeConfig[kind] || badgeConfig.reversal!;
  const label = TRANSACTION_KIND_LABELS[kind] || kind;

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide py-0 px-1.5",
        config.classes,
        className
      )}
    >
      {showIcon && config.icon}
      <span>{label}</span>
    </Badge>
  );
}
