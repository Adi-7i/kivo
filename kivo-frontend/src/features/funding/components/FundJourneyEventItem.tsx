import * as React from "react";
import Link from "next/link";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { formatDateDisplay } from "@/lib/formatters/date";
import {
  ArrowDownLeft,
  ArrowUpRight,
  HandCoins,
  Receipt,
  ArrowLeftRight,
  RotateCcw,
  Flag,
  ExternalLink,
  User,
  Tag,
  Landmark,
} from "lucide-react";
import type { FundJourneyEvent } from "../types";

interface FundJourneyEventItemProps {
  event: FundJourneyEvent;
  isLast?: boolean;
}

export function FundJourneyEventItem({ event, isLast = false }: FundJourneyEventItemProps) {
  const getEventBadge = () => {
    switch (event.eventType) {
      case "received":
        return {
          icon: <ArrowDownLeft className="size-4 text-emerald-600 dark:text-emerald-400" />,
          bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300",
          nodeColor: "bg-emerald-600 border-emerald-100",
          label: "Money Inflow",
        };
      case "expense":
        return {
          icon: <ArrowUpRight className="size-4 text-destructive" />,
          bg: "bg-destructive/10 border-destructive/20 text-destructive",
          nodeColor: "bg-destructive border-red-100",
          label: "Personal Expense",
        };
      case "lent":
        return {
          icon: <HandCoins className="size-4 text-blue-600 dark:text-blue-400" />,
          bg: "bg-blue-500/10 border-blue-500/20 text-blue-800 dark:text-blue-300",
          nodeColor: "bg-blue-600 border-blue-100",
          label: "Lent to Friend (Asset)",
        };
      case "repayment_received":
        return {
          icon: <Receipt className="size-4 text-teal-600 dark:text-teal-400" />,
          bg: "bg-teal-500/10 border-teal-500/20 text-teal-800 dark:text-teal-300",
          nodeColor: "bg-teal-600 border-teal-100",
          label: "Loan Repayment Received",
        };
      case "transfer":
        return {
          icon: <ArrowLeftRight className="size-4 text-indigo-600 dark:text-indigo-400" />,
          bg: "bg-indigo-500/10 border-indigo-500/20 text-indigo-800 dark:text-indigo-300",
          nodeColor: "bg-indigo-600 border-indigo-100",
          label: "Internal Transfer (Balance Shift)",
        };
      case "refund":
        return {
          icon: <RotateCcw className="size-4 text-emerald-600 dark:text-emerald-400" />,
          bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300",
          nodeColor: "bg-emerald-600 border-emerald-100",
          label: "Refund / Recovery",
        };
      case "reversal":
        return {
          icon: <RotateCcw className="size-4 text-orange-600 dark:text-orange-400" />,
          bg: "bg-orange-500/10 border-orange-500/20 text-orange-800 dark:text-orange-300",
          nodeColor: "bg-orange-600 border-orange-100",
          label: "Correction / Reversal",
        };
      case "exhausted":
        return {
          icon: <Flag className="size-4 text-neutral-600 dark:text-neutral-400" />,
          bg: "bg-neutral-100 border-neutral-300 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200",
          nodeColor: "bg-neutral-600 border-neutral-200",
          label: "Batch Exhaustion Milestone",
        };
    }
  };

  const badge = getEventBadge();

  return (
    <div className="relative flex items-start gap-4 group">
      {/* Connector Line */}
      {!isLast && (
        <span
          className="absolute left-4 top-8 -bottom-2 w-0.5 bg-border -translate-x-1/2 group-hover:bg-kivo-primary/40 transition-colors"
          aria-hidden="true"
        />
      )}

      {/* Node Dot / Icon Badge */}
      <div
        className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border shadow-2xs ${badge.bg}`}
      >
        {badge.icon}
      </div>

      {/* Event Content Card */}
      <div className="flex-1 rounded-xl border border-border bg-card p-4 shadow-2xs space-y-2 mb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-foreground font-heading">{event.title}</h4>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.bg}`}
            >
              {badge.label}
            </span>
          </div>

          {event.allocatedAmountPaise > 0 && (
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <span className="text-[11px] text-muted-foreground">Allocated:</span>
              <MoneyAmount
                paise={event.allocatedAmountPaise}
                size="sm"
                tabular
                className={`font-bold ${
                  event.eventType === "expense"
                    ? "text-destructive"
                    : event.eventType === "lent"
                      ? "text-blue-600"
                      : "text-foreground"
                }`}
              />
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">{event.description}</p>

        {/* Metadata Chips: Date, Category, Account, Person, Transaction Link */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted-foreground">
          <span>{formatDateDisplay(event.effectiveDate)}</span>

          {event.categoryName && (
            <>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-foreground/80 font-medium">
                <Tag className="size-3 text-muted-foreground" />
                {event.categoryName}
              </span>
            </>
          )}

          {event.accountName && (
            <>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-foreground/80 font-medium">
                <Landmark className="size-3 text-muted-foreground" />
                {event.accountName}
              </span>
            </>
          )}

          {event.targetPerson && (
            <>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-300 font-semibold">
                <User className="size-3 text-blue-600" />
                Borrower: {event.targetPerson}
              </span>
            </>
          )}

          {event.transactionId && (
            <>
              <span>•</span>
              <Link
                href={`/transactions/${event.transactionId}`}
                className="inline-flex items-center gap-1 text-kivo-primary hover:underline font-medium"
              >
                <span>View Transaction</span>
                <ExternalLink className="size-3" />
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
