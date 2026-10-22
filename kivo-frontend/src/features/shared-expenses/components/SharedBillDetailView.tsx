"use client";

import * as React from "react";
import Link from "next/link";
import { SharedBillDetailHeader } from "./SharedBillDetailHeader";
import { BillParticipantShares } from "./BillParticipantShares";
import { RepaymentModal } from "@/features/lending/components/RepaymentModal";
import { PREVIEW_CLAIMS } from "@/features/lending/data/previewLoans";
import { ArrowLeft, Info } from "lucide-react";
import type { SharedBillEntity, ParticipantShare } from "../types";

interface SharedBillDetailViewProps {
  initialBill: SharedBillEntity;
}

export function SharedBillDetailView({ initialBill }: SharedBillDetailViewProps) {
  const [bill, setBill] = React.useState<SharedBillEntity>(initialBill);
  const [isSettleModalOpen, setIsSettleModalOpen] = React.useState(false);
  const [selectedClaimId, setSelectedClaimId] = React.useState<string>("");

  const handleSettleShare = (share: ParticipantShare) => {
    if (share.claimId) {
      setSelectedClaimId(share.claimId);
    } else {
      const match = PREVIEW_CLAIMS.find((c) => c.contactId === share.contactId);
      setSelectedClaimId(match?.id || "");
    }
    setIsSettleModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/shared-expenses"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Shared Bills</span>
        </Link>
      </div>

      {/* Bill Overview Header */}
      <SharedBillDetailHeader bill={bill} />

      {/* Participant Shares Breakdown */}
      <div className="space-y-4">
        <BillParticipantShares
          shares={bill.shares}
          payerContactId={bill.payerContactId}
          onSettleShare={handleSettleShare}
        />
      </div>

      {/* Accounting Rule Callout */}
      <div className="rounded-xl border border-border/80 bg-muted/20 p-4 text-xs flex items-start gap-3">
        <Info className="size-4 text-kivo-secondary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-foreground block">
            Proportional Conservation of Split Amounts
          </span>
          <p className="text-muted-foreground text-[11px] leading-normal">
            Every paisa of this bill is strictly conserved. In an equal split, any odd remainder
            paise are allocated to the owner first, then ascending participant IDs. When
            participants settle their individual shares, your cash increases and their receivable
            claim reduces without creating false external income.
          </p>
        </div>
      </div>

      {/* Settlement Modal */}
      <RepaymentModal
        open={isSettleModalOpen}
        onOpenChange={setIsSettleModalOpen}
        defaultClaimId={selectedClaimId}
        claims={PREVIEW_CLAIMS}
        onSuccess={() => {
          setBill((b) => ({ ...b, status: "all_settled" }));
        }}
      />
    </div>
  );
}
