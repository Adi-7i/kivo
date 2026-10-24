import * as React from "react";
import Link from "next/link";
import { TransactionTypeBadge } from "@/features/shared-financial/TransactionTypeBadge";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { Badge } from "@/components/ui/badge";
import { formatDateDisplay } from "@/lib/formatters/date";
import type { TransactionEntity } from "../types";
import { ChevronRight } from "lucide-react";

interface TransactionTableProps {
  transactions: TransactionEntity[];
}

export function TransactionTable({ transactions }: TransactionTableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3">
              Date
            </th>
            <th scope="col" className="px-3 py-3">
              Type
            </th>
            <th scope="col" className="px-3 py-3">
              Title & Merchant
            </th>
            <th scope="col" className="px-3 py-3">
              Category
            </th>
            <th scope="col" className="px-3 py-3">
              Account
            </th>
            <th scope="col" className="px-3 py-3">
              Status
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              Amount
            </th>
            <th scope="col" className="px-3 py-3 text-right">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {transactions.map((tx) => {
            const isExpense = tx.kind === "expense";
            const isReceipt = tx.kind === "receipt";

            return (
              <tr key={tx.id} className="hover:bg-muted/30 transition-colors group cursor-pointer">
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground font-medium">
                  {formatDateDisplay(tx.effectiveDate)}
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <TransactionTypeBadge kind={tx.kind} />
                </td>
                <td className="px-3 py-3">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-foreground">{tx.title}</p>
                    {tx.merchant && (
                      <p className="text-[10px] text-muted-foreground">{tx.merchant}</p>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                  {tx.categoryName || "—"}
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="font-medium text-foreground">{tx.accountName}</span>
                  {tx.destinationName && (
                    <span className="text-muted-foreground block text-[10px]">
                      &rarr; {tx.destinationName}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase font-semibold border-border/80 text-muted-foreground"
                  >
                    {tx.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <MoneyAmount
                    paise={tx.amountPaise}
                    variant={isExpense ? "expense" : isReceipt ? "income" : "transfer"}
                    size="sm"
                    tabular
                  />
                </td>
                <td className="px-3 py-3 text-right whitespace-nowrap">
                  <Link
                    prefetch={false}
                    href={`/transactions/${tx.id}`}
                    className="inline-flex items-center text-muted-foreground group-hover:text-kivo-primary transition-colors p-1 rounded-md"
                    aria-label={`View details for ${tx.title}`}
                  >
                    <ChevronRight className="size-4" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
