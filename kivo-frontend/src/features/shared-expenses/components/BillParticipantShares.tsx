import * as React from "react";
import { ContactAvatar } from "@/features/people/components/ContactAvatar";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock } from "lucide-react";
import type { ParticipantShare } from "../types";

interface BillParticipantSharesProps {
  shares: ParticipantShare[];
  payerContactId: string | null;
  onSettleShare?: (share: ParticipantShare) => void;
}

export function BillParticipantShares({
  shares,
  payerContactId,
  onSettleShare,
}: BillParticipantSharesProps) {
  return (
    <div className="rounded-xl border border-border/80 bg-card overflow-hidden space-y-0">
      <div className="p-4 border-b border-border/60 bg-muted/20 flex items-center justify-between text-xs">
        <span className="font-semibold text-foreground">Participant Shares Breakdown</span>
        <span className="text-muted-foreground">{shares.length} Participants</span>
      </div>

      <div className="divide-y divide-border/40">
        {shares.map((share, index) => {
          const isUser = share.contactId === null;
          const isPayer =
            (isUser && payerContactId === null) || (!isUser && share.contactId === payerContactId);

          return (
            <div
              key={share.contactId || `user-${index}`}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/10 transition-colors"
            >
              {/* Left: Avatar + Name + badges */}
              <div className="flex items-center gap-3">
                <ContactAvatar name={share.displayName} size="md" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">
                      {share.displayName} {isUser && "(You)"}
                    </span>
                    {isPayer && (
                      <Badge
                        variant="outline"
                        className="text-[10px] py-0 px-1.5 border-kivo-sage text-kivo-brand-dark bg-kivo-sage/10 font-normal"
                      >
                        Payer
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {isUser
                      ? "Personal Expense Share"
                      : isPayer
                        ? "Paid the bill upfront"
                        : "Receivable Claim"}
                  </span>
                </div>
              </div>

              {/* Right: Amount + Status + Settle button */}
              <div className="flex items-center justify-between sm:justify-end gap-4">
                <div className="text-right">
                  <MoneyAmount
                    paise={share.amountPaise}
                    size="sm"
                    variant={isUser ? "expense" : "default"}
                  />
                  <div className="text-[11px]">
                    {share.status === "settled" ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                        <CheckCircle2 className="size-3" /> Settled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                        <Clock className="size-3" /> Awaiting Settlement
                      </span>
                    )}
                  </div>
                </div>

                {!isPayer && share.status !== "settled" && onSettleShare && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSettleShare(share)}
                    className="text-xs h-8 px-2.5"
                  >
                    Record Settlement
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
