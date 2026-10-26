import * as React from "react";
import Link from "next/link";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { ClaimStatusBadge } from "./ClaimStatusBadge";
import { Button } from "@/components/ui/button";
import type { ClaimEntity } from "../types";
interface Props {
  claim: ClaimEntity;
  onSettle?: (claim: ClaimEntity) => void;
}
export function ClaimCard({ claim, onSettle }: Props) {
  const incoming = claim.direction === "receivable";
  return (
    <div
      className="rounded-xl border border-border/80 bg-card p-4 hover:border-kivo-sage/70 transition-all duration-200 space-y-3"
      data-testid={`claim-${claim.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <p className="font-semibold text-sm break-words">{claim.title}</p>
          <ClaimStatusBadge status={claim.status} />
          <p className="text-xs text-muted-foreground">
            {incoming ? "Receivable from" : "Payable to"} {claim.contactName}
          </p>
          {claim.effectiveDate && <p className="text-xs">{claim.effectiveDate}</p>}
        </div>
        {onSettle && claim.outstandingPaise > 0 && claim.status !== "cancelled" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSettle(claim)}
            className="shrink-0 text-xs"
          >
            {incoming ? "Record Repayment" : "Pay Back"}
          </Button>
        )}
      </div>
      <div className="flex flex-wrap justify-between gap-3 text-xs">
        <p>
          Principal: <MoneyAmount paise={claim.principalPaise} size="sm" />
        </p>
        <p>
          Outstanding:{" "}
          <MoneyAmount
            paise={claim.outstandingPaise}
            size="sm"
            variant={incoming ? "income" : "reserved"}
          />
        </p>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Amounts you owe and amounts owed to you are shown separately.
      </p>
      {claim.sourceEventId && (
        <Link
          prefetch={false}
          href={`/transactions/${claim.sourceEventId}`}
          className="text-xs text-kivo-primary"
        >
          Originating event →
        </Link>
      )}
      {claim.notes && <p className="text-xs text-muted-foreground">{claim.notes}</p>}
    </div>
  );
}
