import * as React from "react";
import Link from "next/link";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { Badge } from "@/components/ui/badge";
import { ContactAvatar } from "@/features/people/components/ContactAvatar";
import { ChevronRight, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import type { SharedBillEntity } from "../types";

interface SharedBillCardProps {
  bill: SharedBillEntity;
}

export function SharedBillCard({ bill }: SharedBillCardProps) {
  const isUserPayer = bill.payerContactId === null;

  return (
    <div className="group rounded-xl border border-border/80 bg-card p-4 transition-all duration-200 hover:border-kivo-sage hover:shadow-xs space-y-3">
      {/* Top: Title, Date, Chevron */}
      <div className="flex items-start justify-between gap-3">
        <Link
          prefetch={false}
          href={`/shared-expenses/${bill.id}`}
          className="space-y-0.5 flex-1 min-w-0 group-hover:text-foreground"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground text-sm truncate">{bill.title}</span>
            <Badge
              variant="outline"
              className="text-[10px] py-0 px-1.5 font-normal capitalize border-border"
            >
              {bill.splitMethod} split
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span className="font-mono text-[11px]">{bill.effectiveDate}</span>
            <span>&bull;</span>
            <span>{bill.category}</span>
            {bill.merchant && (
              <>
                <span>&bull;</span>
                <span className="truncate max-w-[160px]">{bill.merchant}</span>
              </>
            )}
          </div>
        </Link>

        <Link
          prefetch={false}
          href={`/shared-expenses/${bill.id}`}
          aria-label={`View bill details for ${bill.title}`}
          className="text-muted-foreground group-hover:text-foreground p-1 transition-colors"
        >
          <ChevronRight className="size-4" />
        </Link>
      </div>

      {/* Financial Split Breakdown */}
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/30 p-2.5 text-xs">
        <div>
          <span className="text-[11px] text-muted-foreground block">Gross Bill Amount</span>
          <MoneyAmount paise={bill.amountPaise} size="sm" variant="default" />
          <span className="text-[10px] text-muted-foreground block truncate">
            Paid by: <span className="font-medium text-foreground">{bill.payerName}</span>
          </span>
        </div>

        <div>
          <span className="text-[11px] text-muted-foreground block">Your Personal Share</span>
          <MoneyAmount paise={bill.userSharePaise} size="sm" variant="expense" />
          <span className="text-[10px] text-muted-foreground block">
            {isUserPayer
              ? "Friends' outstanding amounts are tracked per claim"
              : "Payable and settlements are tracked per claim"}
          </span>
        </div>
      </div>

      {/* Participants & Status */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50 text-xs">
        {/* Participants Avatars */}
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-1.5 overflow-hidden">
            {bill.shares.map((share, idx) => (
              <ContactAvatar
                key={share.contactId || `user-${idx}`}
                name={share.displayName}
                size="sm"
                className="border-2 border-card"
              />
            ))}
          </div>
          <span className="text-[11px] text-muted-foreground">
            {bill.shares.length} participant{bill.shares.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* Status indicator */}
        <div>
          {bill.status === "not_verified" ? (
            <span>Checking claims</span>
          ) : bill.status === "reversed" || bill.status === "voided" ? (
            <span>{bill.status}</span>
          ) : bill.status === "all_settled" ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="size-3 text-emerald-600" /> Settled
            </span>
          ) : bill.status === "partially_settled" ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
              <Clock className="size-3 text-amber-600" /> Partially Settled
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 dark:text-blue-400">
              <AlertCircle className="size-3 text-blue-600" /> Unsettled
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
