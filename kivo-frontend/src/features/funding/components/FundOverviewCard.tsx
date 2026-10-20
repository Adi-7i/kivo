import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { formatDateDisplay } from "@/lib/formatters/date";
import { FundingStatusBadge } from "./FundingStatusBadge";
import { ExhaustionBanner } from "./ExhaustionBanner";
import { Landmark, Banknote, Wallet, Calendar, User, Info, ArrowUpRight } from "lucide-react";
import type { MoneySourceEntity } from "../types";

interface FundOverviewCardProps {
  source: MoneySourceEntity;
  className?: string;
}

export function FundOverviewCard({ source, className }: FundOverviewCardProps) {
  const getAccountIcon = (kind: "bank" | "cash" | "wallet") => {
    switch (kind) {
      case "bank":
        return <Landmark className="size-4 text-kivo-primary" />;
      case "cash":
        return <Banknote className="size-4 text-kivo-primary" />;
      case "wallet":
        return <Wallet className="size-4 text-kivo-primary" />;
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Money Source Batch
            </span>
            <FundingStatusBadge status={source.status} />
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold font-heading text-foreground">
            {source.name}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-3">
            {source.sourcePerson && (
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                <User className="size-3.5 text-kivo-primary" />
                Received from: {source.sourcePerson}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3.5 text-muted-foreground" />
              Credited on: {formatDateDisplay(source.receivedDate)}
            </span>
            <span className="inline-flex items-center gap-1">
              {getAccountIcon(source.creditedAccountKind)}
              Account: {source.creditedAccountName}
            </span>
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Exhaustion / Status Banner */}
        <ExhaustionBanner source={source} />

        {/* 4 Core Financial Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Original Inflow */}
          <div className="rounded-xl border border-border bg-card p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Original Inflow Amount
            </span>
            <MoneyAmount
              paise={source.originalAmountPaise}
              size="lg"
              tabular
              className="font-extrabold text-foreground"
            />
            <p className="text-[11px] text-muted-foreground">
              Initial money established in the ledger
            </p>
          </div>

          {/* Card 2: Attributed Spent */}
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-destructive block">
                Personal Expenses
              </span>
              <ArrowUpRight className="size-3.5 text-destructive" />
            </div>
            <MoneyAmount
              paise={source.attributedSpentPaise}
              size="lg"
              tabular
              className="font-extrabold text-destructive"
            />
            <p className="text-[11px] text-muted-foreground">Consumed for personal living costs</p>
          </div>

          {/* Card 3: Attributed Lent */}
          <div className="rounded-xl border border-blue-600/20 bg-blue-500/5 p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 block">
                Lent to Friends (Asset)
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 font-semibold">
                Receivable
              </span>
            </div>
            <MoneyAmount
              paise={source.attributedLentPaise}
              size="lg"
              tabular
              className="font-extrabold text-blue-600"
            />
            <p className="text-[11px] text-muted-foreground">
              Temporarily given; expected to be repaid
            </p>
          </div>

          {/* Card 4: Remaining Liquid Funds */}
          <div className="rounded-xl border border-kivo-primary/25 bg-kivo-primary/5 p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-kivo-brand-dark dark:text-kivo-sage block">
              Remaining Liquid Allocation
            </span>
            <MoneyAmount
              paise={source.remainingPaise}
              size="lg"
              tabular
              className="font-extrabold text-kivo-primary"
            />
            <p className="text-[11px] text-muted-foreground">
              Authoritative unallocated funds balance
            </p>
          </div>
        </div>

        {/* Financial Accounting Rules Invariant Notice */}
        <div className="flex items-start gap-2.5 rounded-lg border border-border/80 bg-muted/30 p-3 text-xs text-muted-foreground">
          <Info className="size-4 shrink-0 text-kivo-primary mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-foreground text-xs">
              Financial Accounting Invariant: Spending ≠ Lending ≠ Remaining Funds
            </p>
            <p className="text-[11px] leading-relaxed">
              Kivo strictly distinguishes personal consumption expenses from money lent to friends.
              Lending creates a balance-sheet asset (receivable), not a personal expense. Original
              Inflow (₹{(source.originalAmountPaise / 100).toLocaleString("en-IN")}) = Spent (₹
              {(source.attributedSpentPaise / 100).toLocaleString("en-IN")}) + Lent (₹
              {(source.attributedLentPaise / 100).toLocaleString("en-IN")}) + Remaining (₹
              {(source.remainingPaise / 100).toLocaleString("en-IN")}).
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
