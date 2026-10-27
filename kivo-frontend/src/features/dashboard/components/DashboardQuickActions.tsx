import * as React from "react";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownLeft, ArrowRightLeft, ListOrdered } from "lucide-react";
import Link from "next/link";

interface DashboardQuickActionsProps {
  onAddExpense: () => void;
  onAddReceipt: () => void;
  onAddTransfer: () => void;
}

export function DashboardQuickActions({
  onAddExpense,
  onAddReceipt,
  onAddTransfer,
}: DashboardQuickActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <Button
        variant="outline"
        size="sm"
        onClick={onAddExpense}
        className="gap-1.5 rounded-lg border-finance-expense/25 bg-finance-expense/5 text-finance-expense hover:bg-finance-expense/15 transition-all duration-150"
      >
        <ArrowUpRight className="size-3.5" />
        <span className="font-medium text-xs">Add Expense</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onAddReceipt}
        className="gap-1.5 rounded-lg border-finance-income/25 bg-finance-income/5 text-finance-income hover:bg-finance-income/15 transition-all duration-150"
      >
        <ArrowDownLeft className="size-3.5" />
        <span className="font-medium text-xs">Money Received</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onAddTransfer}
        className="gap-1.5 rounded-lg border-finance-transfer/25 bg-finance-transfer/5 text-finance-transfer hover:bg-finance-transfer/15 transition-all duration-150"
      >
        <ArrowRightLeft className="size-3.5" />
        <span className="font-medium text-xs">Transfer</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        asChild
        className="gap-1.5 text-xs text-muted-foreground hover:text-foreground ml-auto"
      >
        <Link href="/transactions">
          <ListOrdered className="size-3.5" />
          <span>Full History</span>
        </Link>
      </Button>
    </div>
  );
}

