import * as React from "react";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { Badge } from "@/components/ui/badge";
import { Receipt, Calendar, Store, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import type { SharedBillEntity } from "../types";

interface SharedBillDetailHeaderProps {
  bill: SharedBillEntity;
}

export function SharedBillDetailHeader({ bill }: SharedBillDetailHeaderProps) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-5">
      {/* Top row: Title + badges */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground tracking-tight">
              {bill.title}
            </h1>
            <Badge
              variant="outline"
              className="text-xs py-0.5 px-2 font-normal capitalize border-kivo-sage/50 text-kivo-brand-dark dark:text-kivo-sage bg-kivo-sage/10"
            >
              {bill.splitMethod} Split
            </Badge>
          </div>

          <div className="flex items-center gap-2.5 text-xs text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1">
              <Calendar className="size-3.5" />
              <span className="font-mono text-[11px]">{bill.effectiveDate}</span>
            </div>
            <span>&bull;</span>
            <div className="flex items-center gap-1">
              <Receipt className="size-3.5" />
              <span>{bill.category}</span>
            </div>
            {bill.merchant && (
              <>
                <span>&bull;</span>
                <div className="flex items-center gap-1">
                  <Store className="size-3.5" />
                  <span>{bill.merchant}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {bill.status === "reversed" ||
          bill.status === "voided" ||
          bill.status === "not_verified" ? (
            <Badge variant="outline">
              {bill.status === "not_verified" ? "Checking claims" : bill.status}
            </Badge>
          ) : bill.status === "all_settled" ? (
            <Badge
              variant="outline"
              className="gap-1 border-emerald-300 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-xs py-1 px-2.5"
            >
              <CheckCircle2 className="size-3.5 text-emerald-600" />
              <span>All Settled Up</span>
            </Badge>
          ) : bill.status === "partially_settled" ? (
            <Badge
              variant="outline"
              className="gap-1 border-amber-300 text-amber-800 bg-amber-50 dark:bg-amber-950/40 text-xs py-1 px-2.5"
            >
              <Clock className="size-3.5 text-amber-600" />
              <span>Partially Settled</span>
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="gap-1 border-blue-300 text-blue-800 bg-blue-50 dark:bg-blue-950/40 text-xs py-1 px-2.5"
            >
              <AlertCircle className="size-3.5 text-blue-600" />
              <span>Active Dues</span>
            </Badge>
          )}
        </div>
      </div>

      {bill.notes && (
        <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">{bill.notes}</p>
      )}

      {/* Financial Split Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        {/* Gross Total */}
        <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-1">
          <span className="text-xs font-medium text-muted-foreground block">Total Gross Bill</span>
          <MoneyAmount paise={bill.amountPaise} size="xl" variant="default" />
          <p className="text-[11px] text-muted-foreground">
            Paid by: <span className="font-semibold text-foreground">{bill.payerName}</span>
          </p>
        </div>

        {/* User's Personal Share */}
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 dark:bg-destructive/10 p-4 space-y-1">
          <span className="text-xs font-medium text-destructive dark:text-destructive-foreground block">
            Original Personal Expense Share
          </span>
          <MoneyAmount paise={bill.userSharePaise} size="xl" variant="expense" />
          <p className="text-[11px] text-muted-foreground">
            Server-recognized share of this immutable bill revision
          </p>
        </div>

        {/* Friends' Total */}
        <div className="rounded-xl border border-border/80 bg-card p-4 space-y-1">
          <span className="text-xs font-medium text-muted-foreground block">
            Participants & Claims
          </span>
          <p className="text-xl font-bold">{bill.shares.length} participants</p>
          <p className="text-[11px] text-muted-foreground">
            Outstanding liabilities and assets are shown individually below, never inferred from
            gross minus owner share.
          </p>
        </div>
      </div>
    </div>
  );
}
