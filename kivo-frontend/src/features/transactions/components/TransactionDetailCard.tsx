"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionTypeBadge } from "@/features/shared-financial/TransactionTypeBadge";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { decimalPaise } from "@/features/finance/api";
import { usePendingFinancialWrite } from "@/features/finance/useFinancialWrite";
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

import { TransactionActionModal } from "./TransactionActionModal";

interface TransactionDetailCardProps {
  transaction: TransactionEntity;
}

export function TransactionDetailCard({ transaction }: TransactionDetailCardProps) {
  const [actionModalOpen, setActionModalOpen] = React.useState(false);
  const pendingWrite = usePendingFinancialWrite(`transaction:${transaction.id}:action`);

  const isExpense = transaction.kind === "expense";
  const isReceipt = transaction.kind === "receipt";

  return (
    <div className="space-y-6 text-left">
      {/* Top back navigation */}
      <div className="flex items-center justify-between">
        <Link
          prefetch={false}
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

      {/* Primary Overview Card */}
      <Card className="border-border shadow-xs bg-card">
        <CardHeader className="pb-4 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 break-all">
                <TransactionTypeBadge kind={transaction.kind} />
                <span className="text-xs text-muted-foreground">Ref #{transaction.id}</span>
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
                <p className="font-semibold text-foreground text-sm">{transaction.merchant}</p>
              </div>
            )}

            {transaction.paymentMethod && (
              <div className="rounded-lg border border-border/70 p-3 bg-muted/20 space-y-1">
                <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                  <CreditCard className="size-3 text-kivo-primary" />
                  Payment Method
                </span>
                <p className="font-semibold text-foreground text-sm">{transaction.paymentMethod}</p>
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
              <p className="text-foreground leading-relaxed">{transaction.notes}</p>
            </div>
          )}

          {/* Double-Entry Account Activity */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3 text-xs">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2">
              <Scale className="size-4 text-kivo-primary" />
              <h3 className="font-bold text-foreground uppercase tracking-wider text-xs">
                Account Activity
              </h3>
            </div>
            <p className="text-[11px] text-muted-foreground">
              See the accounts and outstanding amounts affected by this transaction:
            </p>

            <div className="divide-y divide-border/60">
              {transaction.raw?.financial_effects.map((leg, index) => (
                <div key={index} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="font-semibold capitalize">{leg.book}</p>
                    <p className="text-muted-foreground text-[10px] break-all">
                      {leg.account || leg.claim || "Related account"}
                    </p>
                  </div>
                  <MoneyAmount paise={decimalPaise(leg.amount)} size="xs" />
                </div>
              ))}
            </div>
            {transaction.raw?.funding_source && (
              <p>Funding source: {transaction.raw.funding_source}</p>
            )}
            {transaction.raw?.reason && <p>Audit reason: {transaction.raw.reason}</p>}
            {transaction.raw?.reversed_by && (
              <Link
                prefetch={false}
                className="block text-kivo-primary break-all"
                href={`/transactions/${transaction.raw.reversed_by}`}
              >
                View linked reversal
              </Link>
            )}
            {transaction.raw?.supersedes && (
              <Link
                prefetch={false}
                className="block text-kivo-primary"
                href={`/transactions/${transaction.raw.supersedes}`}
              >
                View original corrected entry
              </Link>
            )}
            {transaction.raw?.reverses && (
              <Link
                prefetch={false}
                className="block text-kivo-primary"
                href={`/transactions/${transaction.raw.reverses}`}
              >
                View reversed original
              </Link>
            )}
          </div>

          {/* Audit & Correction Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-border/60">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 text-finance-income" />
              <span>Original record retained in your history</span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setActionModalOpen(true);
              }}
              disabled={
                !pendingWrite &&
                (!transaction.raw ||
                  transaction.status !== "posted" ||
                  !["opening", "receipt", "expense", "transfer", "refund"].includes(
                    transaction.kind
                  ))
              }
              className="gap-1.5 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <RotateCcw className="size-3.5" />
              <span>
                {pendingWrite ? "Resolve pending request" : "Record Reversal / Correction"}
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <TransactionActionModal
        open={actionModalOpen}
        onOpenChange={setActionModalOpen}
        transaction={transaction}
      />
    </div>
  );
}
