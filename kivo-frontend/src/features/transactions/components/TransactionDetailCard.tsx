"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionTypeBadge } from "@/features/shared-financial/TransactionTypeBadge";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IntegrationPendingBadge } from "@/components/shared/IntegrationPendingBadge";
import { formatDateDisplay } from "@/lib/formatters/date";
import type { TransactionEntity } from "../types";
import {
  ArrowLeft,
  Calendar,
  Building2,
  Tag,
  Store,
  CreditCard,
  FileText,
  RotateCcw,
  ShieldCheck,
  Scale,
} from "lucide-react";

interface TransactionDetailCardProps {
  transaction: TransactionEntity;
}

export function TransactionDetailCard({ transaction }: TransactionDetailCardProps) {
  const [reversalAttempted, setReversalAttempted] = React.useState(false);

  const isExpense = transaction.kind === "expense";
  const isReceipt = transaction.kind === "receipt";

  return (
    <div className="space-y-6 text-left">
      {/* Top back navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/transactions"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Transactions</span>
        </Link>

        <Badge
          variant="outline"
          className="text-xs uppercase font-bold border-border text-foreground"
        >
          Status: {transaction.status}
        </Badge>
      </div>

      {reversalAttempted && (
        <IntegrationPendingBadge
          variant="banner"
          message="Backend integration pending: Transaction corrections and ledger reversals will execute against the Django API in subsequent phases. No ledger mutations occurred."
        />
      )}

      {/* Primary Overview Card */}
      <Card className="border-border shadow-xs bg-card">
        <CardHeader className="pb-4 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <TransactionTypeBadge kind={transaction.kind} />
                <span className="text-xs text-muted-foreground">
                  Ref #{transaction.id}
                </span>
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold font-heading text-foreground">
                {transaction.title}
              </CardTitle>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider block">
                Total Amount
              </span>
              <MoneyAmount
                paise={transaction.amountPaise}
                variant={isExpense ? "expense" : isReceipt ? "income" : "transfer"}
                showSign={isExpense || isReceipt}
                size="2xl"
                tabular
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Key Attributes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="rounded-lg border border-border/70 p-3 bg-muted/20 space-y-1">
              <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                <Calendar className="size-3 text-kivo-primary" />
                Effective Date
              </span>
              <p className="font-semibold text-foreground text-sm">
                {formatDateDisplay(transaction.effectiveDate)}
              </p>
            </div>

            <div className="rounded-lg border border-border/70 p-3 bg-muted/20 space-y-1">
              <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                <Building2 className="size-3 text-kivo-primary" />
                Account
              </span>
              <p className="font-semibold text-foreground text-sm">
                {transaction.accountName}
                {transaction.destinationName && (
                  <span className="text-muted-foreground block text-xs font-normal">
                    &rarr; {transaction.destinationName}
                  </span>
                )}
              </p>
            </div>

            <div className="rounded-lg border border-border/70 p-3 bg-muted/20 space-y-1">
              <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                <Tag className="size-3 text-kivo-primary" />
                Category
              </span>
              <p className="font-semibold text-foreground text-sm">
                {transaction.categoryName || "— (Uncategorized)"}
              </p>
            </div>

            {transaction.merchant && (
              <div className="rounded-lg border border-border/70 p-3 bg-muted/20 space-y-1">
                <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                  <Store className="size-3 text-kivo-primary" />
                  Merchant / Payee
                </span>
                <p className="font-semibold text-foreground text-sm">
                  {transaction.merchant}
                </p>
              </div>
            )}

            {transaction.paymentMethod && (
              <div className="rounded-lg border border-border/70 p-3 bg-muted/20 space-y-1">
                <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                  <CreditCard className="size-3 text-kivo-primary" />
                  Payment Method
                </span>
                <p className="font-semibold text-foreground text-sm">
                  {transaction.paymentMethod}
                </p>
              </div>
            )}
          </div>

          {/* Notes Section */}
          {transaction.notes && (
            <div className="rounded-lg border border-border/70 p-3.5 bg-muted/20 space-y-1.5 text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider">
                <FileText className="size-3" />
                Notes & Memorandum
              </span>
              <p className="text-foreground leading-relaxed">
                {transaction.notes}
              </p>
            </div>
          )}

          {/* Double-Entry Ledger Postings Breakdown */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3 text-xs">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2">
              <Scale className="size-4 text-kivo-primary" />
              <h3 className="font-bold text-foreground uppercase tracking-wider text-xs">
                Ledger Postings Breakdown
              </h3>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Every financial event produces balanced double-entry ledger legs in the immutable database:
            </p>

            <div className="divide-y divide-border/60">
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="font-semibold text-foreground">
                    {transaction.accountName}
                  </span>
                  <span className="text-muted-foreground block text-[10px]">
                    Leg 1: Asset Balance Adjustment
                  </span>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-[10px] font-bold">
                    {isExpense ? "CREDIT" : "DEBIT"}
                  </Badge>
                  <MoneyAmount
                    paise={transaction.amountPaise}
                    size="xs"
                    className="block font-tabular mt-0.5"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="font-semibold text-foreground">
                    {transaction.destinationName || transaction.categoryName || "Equity Counterparty"}
                  </span>
                  <span className="text-muted-foreground block text-[10px]">
                    Leg 2: Balancing Ledger Leg
                  </span>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-[10px] font-bold">
                    {isExpense ? "DEBIT" : "CREDIT"}
                  </Badge>
                  <MoneyAmount
                    paise={transaction.amountPaise}
                    size="xs"
                    className="block font-tabular mt-0.5"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Audit & Correction Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-border/60">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 text-finance-income" />
              <span>Immutable Ledger Entry &bull; Append-only architecture</span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReversalAttempted(true)}
              className="gap-1.5 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <RotateCcw className="size-3.5" />
              <span>Record Reversal / Correction</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
