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
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onAddExpense}
        className="gap-1.5 border-finance-expense/30 text-finance-expense hover:bg-finance-expense/10"
      >
        <ArrowUpRight className="size-3.5" />
        <span>Add Expense</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onAddReceipt}
        className="gap-1.5 border-finance-income/30 text-finance-income hover:bg-finance-income/10"
      >
        <ArrowDownLeft className="size-3.5" />
        <span>Money Received</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onAddTransfer}
        className="gap-1.5 border-finance-transfer/30 text-finance-transfer hover:bg-finance-transfer/10"
      >
        <ArrowRightLeft className="size-3.5" />
        <span>Transfer</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        asChild
        className="gap-1.5 text-muted-foreground hover:text-foreground ml-auto"
      >
        <Link href="/transactions">
          <ListOrdered className="size-3.5" />
          <span>Full History</span>
        </Link>
      </Button>
    </div>
  );
}
