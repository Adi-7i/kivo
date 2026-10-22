import * as React from "react";
import Link from "next/link";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { FinancialEmptyState } from "@/features/shared-financial/FinancialEmptyState";
import { formatDateDisplay } from "@/lib/formatters/date";
import { FundingStatusBadge } from "./FundingStatusBadge";
import { MoneySourceCard } from "./MoneySourceCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, Landmark, Banknote, Wallet, User, Inbox } from "lucide-react";
import type { MoneySourceEntity } from "../types";

interface FundingSourceListProps {
  sources: MoneySourceEntity[];
  onResetFilters?: () => void;
  className?: string;
}

export function FundingSourceList({ sources, onResetFilters, className }: FundingSourceListProps) {
  if (sources.length === 0) {
    return (
      <FinancialEmptyState
        title="No Funding Sources Found"
        description="No incoming money batches match your current filter parameters or have been registered yet."
        icon={<Inbox className="size-8 text-muted-foreground" />}
        action={
          onResetFilters ? (
            <Button size="sm" variant="outline" onClick={onResetFilters}>
              Reset Filters
            </Button>
          ) : undefined
        }
      />
    );
  }

  const getAccountIcon = (kind: "bank" | "cash" | "wallet") => {
    switch (kind) {
      case "bank":
        return <Landmark className="size-3 text-muted-foreground" />;
      case "cash":
        return <Banknote className="size-3 text-muted-foreground" />;
      case "wallet":
        return <Wallet className="size-3 text-muted-foreground" />;
    }
  };

  return (
    <div className={className}>
      {/* Mobile view: Stacked Cards */}
      <div className="space-y-3 md:hidden">
        {sources.map((source) => (
          <MoneySourceCard key={source.id} source={source} />
        ))}
      </div>

      {/* Desktop view: Structured Financial Table */}
      <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                <th scope="col" className="py-3 px-4">
                  Funding Source
                </th>
                <th scope="col" className="py-3 px-3">
                  Date
                </th>
                <th scope="col" className="py-3 px-3">
                  Credited Account
                </th>
                <th scope="col" className="py-3 px-3 text-right">
                  Original Inflow
                </th>
                <th scope="col" className="py-3 px-3 text-right">
                  Spent (Expense)
                </th>
                <th scope="col" className="py-3 px-3 text-right">
                  Lent (Asset)
                </th>
                <th scope="col" className="py-3 px-3 text-right">
                  Remaining
                </th>
                <th scope="col" className="py-3 px-3 text-center">
                  Status
                </th>
                <th scope="col" className="py-3 px-4 text-right">
                  Journey
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sources.map((source) => (
                <tr key={source.id} className="hover:bg-muted/30 transition-colors group">
                  {/* Source Name & Person */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-foreground">{source.name}</div>
                    {source.sourcePerson && (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                        <User className="size-3 text-kivo-primary" />
                        <span>{source.sourcePerson}</span>
                      </div>
                    )}
                  </td>

                  {/* Receipt Date */}
                  <td className="py-3.5 px-3 text-muted-foreground whitespace-nowrap">
                    {formatDateDisplay(source.receivedDate)}
                  </td>

                  {/* Credited Account */}
                  <td className="py-3.5 px-3 text-muted-foreground whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                      {getAccountIcon(source.creditedAccountKind)}
                      {source.creditedAccountName}
                    </span>
                  </td>

                  {/* Original Amount */}
                  <td className="py-3.5 px-3 text-right whitespace-nowrap">
                    <MoneyAmount
                      paise={source.originalAmountPaise}
                      size="sm"
                      tabular
                      className="font-bold text-foreground"
                    />
                  </td>

                  {/* Spent */}
                  <td className="py-3.5 px-3 text-right whitespace-nowrap">
                    <MoneyAmount
                      paise={source.attributedSpentPaise}
                      size="sm"
                      tabular
                      className="font-medium text-destructive"
                    />
                  </td>

                  {/* Lent (Asset) */}
                  <td className="py-3.5 px-3 text-right whitespace-nowrap">
                    <MoneyAmount
                      paise={source.attributedLentPaise}
                      size="sm"
                      tabular
                      className="font-medium text-blue-600"
                    />
                  </td>

                  {/* Remaining */}
                  <td className="py-3.5 px-3 text-right whitespace-nowrap">
                    <MoneyAmount
                      paise={source.remainingPaise}
                      size="sm"
                      tabular
                      className="font-bold text-kivo-primary"
                    />
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-3 text-center whitespace-nowrap">
                    <FundingStatusBadge status={source.status} />
                  </td>

                  {/* Action Link */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <Link
                      href={`/money/sources/${source.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-kivo-primary hover:text-kivo-brand-dark transition-colors group-hover:translate-x-0.5 duration-200"
                    >
                      <span>Detail</span>
                      <ArrowRight className="size-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
