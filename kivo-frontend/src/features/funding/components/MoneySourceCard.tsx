import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { formatDateDisplay } from "@/lib/formatters/date";
import { FundingStatusBadge } from "./FundingStatusBadge";
import { FundingProgressIndicator } from "./FundingProgressIndicator";
import { Landmark, Wallet, Banknote, ArrowRight, User } from "lucide-react";
import type { MoneySourceEntity } from "../types";

interface MoneySourceCardProps {
  source: MoneySourceEntity;
  className?: string;
}

export function MoneySourceCard({ source, className }: MoneySourceCardProps) {
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
    <Card className={`hover:border-kivo-primary/40 transition-all ${className ?? ""}`}>
      <CardContent className="p-4 sm:p-5 space-y-3.5">
        {/* Header: Title, Person & Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-foreground leading-tight">{source.name}</h3>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {source.sourcePerson && (
                <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                  <User className="size-3 text-kivo-primary" />
                  {source.sourcePerson}
                </span>
              )}
              <span>•</span>
              <span>{formatDateDisplay(source.receivedDate)}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                {getAccountIcon(source.creditedAccountKind)}
                {source.creditedAccountName}
              </span>
            </div>
          </div>

          <FundingStatusBadge status={source.status} />
        </div>

        {/* Financial Amounts Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-lg bg-muted/40 p-3 text-xs">
          <div>
            <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
              Original Inflow
            </span>
            <MoneyAmount
              paise={source.originalAmountPaise}
              size="sm"
              tabular
              className="font-bold text-foreground"
            />
          </div>

          <div>
            <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
              Spent (Consumption)
            </span>
            <MoneyAmount
              paise={source.attributedSpentPaise}
              size="sm"
              tabular
              className="font-medium text-destructive"
            />
          </div>

          <div>
            <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
              Lent (Asset)
            </span>
            <MoneyAmount
              paise={source.attributedLentPaise}
              size="sm"
              tabular
              className="font-medium text-blue-600"
            />
          </div>

          <div>
            <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
              Remaining
            </span>
            <MoneyAmount
              paise={source.remainingPaise}
              size="sm"
              tabular
              className="font-bold text-kivo-primary"
            />
          </div>
        </div>

        {/* Allocation Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Allocation Progress</span>
            <span>
              {source.status === "exhausted"
                ? "100% Attributed"
                : `${Math.round(((source.attributedSpentPaise + source.attributedLentPaise) / Math.max(1, source.originalAmountPaise)) * 100)}% Used`}
            </span>
          </div>
          <FundingProgressIndicator
            originalAmountPaise={source.originalAmountPaise}
            spentPaise={source.attributedSpentPaise}
            lentPaise={source.attributedLentPaise}
            remainingPaise={source.remainingPaise}
          />
        </div>

        {/* Footer Link to Detail */}
        <div className="pt-1 flex items-center justify-between border-t border-border/60">
          <span className="text-[11px] text-muted-foreground">
            {source.durationDays ? `Lasted ${source.durationDays} days` : "Active funding batch"}
          </span>
          <Link
            href={`/money/sources/${source.id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-kivo-primary hover:text-kivo-brand-dark transition-colors"
          >
            <span>View Fund Journey</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
