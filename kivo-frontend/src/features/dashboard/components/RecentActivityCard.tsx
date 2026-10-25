import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TransactionTypeBadge } from "@/features/shared-financial/TransactionTypeBadge";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { formatDateDisplay } from "@/lib/formatters/date";
import type { TransactionEntity } from "@/features/transactions/types";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface RecentActivityCardProps {
  transactions: TransactionEntity[];
  className?: string;
}

export function RecentActivityCard({ transactions, className }: RecentActivityCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-bold font-heading">Recent Activity</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Latest chronological events recorded in your ledger.
          </CardDescription>
        </div>
        <Link
          href="/transactions"
          className="inline-flex items-center gap-1 text-xs font-semibold text-kivo-primary hover:text-kivo-secondary"
        >
          <span>View all</span>
          <ArrowRight className="size-3" />
        </Link>
      </CardHeader>

      <CardContent className="pt-1">
        {transactions.length === 0 ? (
          <p className="text-xs text-muted-foreground py-8 text-center">
            No recent transactions recorded yet. Use Quick Add above to record an event.
          </p>
        ) : (
          <div className="divide-y divide-border/60">
            {transactions.slice(0, 5).map((tx) => {
              const isExpense = tx.kind === "expense";
              const isReceipt = tx.kind === "receipt";

              return (
                <div key={tx.id} className="flex items-center justify-between py-3 text-xs gap-3">
                  <div className="flex items-center gap-3">
                    <TransactionTypeBadge kind={tx.kind} showIcon={false} />
                    <div className="space-y-0.5">
                      <Link
                        prefetch={false}
                        href={`/transactions/${tx.id}`}
                        className="font-semibold text-foreground break-words"
                      >
                        {tx.title}
                      </Link>
                      <p className="text-[11px] text-muted-foreground">
                        {tx.accountName} {tx.categoryName ? `• ${tx.categoryName}` : ""} •{" "}
                        {formatDateDisplay(tx.effectiveDate)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <MoneyAmount
                      paise={tx.amountPaise}
                      variant={isExpense ? "expense" : isReceipt ? "income" : "transfer"}
                      showSign={false}
                      size="sm"
                      tabular
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
