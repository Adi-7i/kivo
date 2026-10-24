import * as React from "react";
import Link from "next/link";
import { TransactionTypeBadge } from "@/features/shared-financial/TransactionTypeBadge";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { formatDateDisplay } from "@/lib/formatters/date";
import type { TransactionEntity } from "../types";
import { ChevronRight } from "lucide-react";

interface TransactionListMobileProps {
  transactions: TransactionEntity[];
}

export function TransactionListMobile({ transactions }: TransactionListMobileProps) {
  return (
    <div className="space-y-2.5">
      {transactions.map((tx) => {
        const isExpense = tx.kind === "expense";
        const isReceipt = tx.kind === "receipt";

        return (
          <Link
            prefetch={false}
            key={tx.id}
            href={`/transactions/${tx.id}`}
            className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors text-xs gap-3 group"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <TransactionTypeBadge kind={tx.kind} showIcon={false} />
              <div className="space-y-0.5 min-w-0 break-words">
                <p className="font-semibold text-foreground group-hover:text-kivo-primary transition-colors [overflow-wrap:anywhere]">
                  {tx.title}
                </p>
                <p className="text-[10px] uppercase text-muted-foreground">{tx.status}</p>
                <p className="text-[11px] text-muted-foreground">
                  {tx.accountName} {tx.categoryName ? `• ${tx.categoryName}` : ""} •{" "}
                  {formatDateDisplay(tx.effectiveDate)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <MoneyAmount
                paise={tx.amountPaise}
                variant={isExpense ? "expense" : isReceipt ? "income" : "transfer"}
                size="sm"
                tabular
              />
              <ChevronRight className="size-4 text-muted-foreground" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
