"use client";

import * as React from "react";
import Link from "next/link";
import { ContactDetailHeader } from "@/features/people/components/ContactDetailHeader";
import { ContactActivityTimeline } from "@/features/people/components/ContactActivityTimeline";
import { ContactModal } from "@/features/people/components/ContactModal";
import { LendBorrowModal } from "@/features/lending/components/LendBorrowModal";
import { RepaymentModal } from "@/features/lending/components/RepaymentModal";
import { ClaimCard } from "@/features/lending/components/ClaimCard";
import {
  PREVIEW_CONTACTS,
  PREVIEW_CONTACT_ACTIVITIES,
} from "@/features/people/data/previewContacts";
import { PREVIEW_CLAIMS } from "@/features/lending/data/previewLoans";
import { ArrowLeft, HandCoins } from "lucide-react";
import type { ContactEntity } from "@/features/people/types";

interface ContactDetailViewProps {
  initialContact: ContactEntity;
}

export function ContactDetailView({ initialContact }: ContactDetailViewProps) {
  const [contact, setContact] = React.useState<ContactEntity>(initialContact);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isLendBorrowOpen, setIsLendBorrowOpen] = React.useState(false);
  const [lendBorrowKind, setLendBorrowKind] = React.useState<"lend" | "borrow">("lend");
  const [isRepayOpen, setIsRepayOpen] = React.useState(false);
  const [selectedClaimId, setSelectedClaimId] = React.useState<string>("");

  const activities = React.useMemo(() => {
    return PREVIEW_CONTACT_ACTIVITIES[contact.id] || [];
  }, [contact.id]);

  const contactClaims = React.useMemo(() => {
    return PREVIEW_CLAIMS.filter((c) => c.contactId === contact.id);
  }, [contact.id]);

  const receivableClaims = React.useMemo(() => {
    return contactClaims.filter((c) => c.direction === "receivable");
  }, [contactClaims]);

  const payableClaims = React.useMemo(() => {
    return contactClaims.filter((c) => c.direction === "payable");
  }, [contactClaims]);

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/people"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Contacts</span>
        </Link>
      </div>

      {/* Profile Header */}
      <ContactDetailHeader
        contact={contact}
        onEdit={() => setIsEditOpen(true)}
        onLend={() => {
          setLendBorrowKind("lend");
          setIsLendBorrowOpen(true);
        }}
        onBorrow={() => {
          setLendBorrowKind("borrow");
          setIsLendBorrowOpen(true);
        }}
        onRepay={() => {
          const firstOpen = contactClaims.find((c) => c.status !== "settled");
          setSelectedClaimId(firstOpen?.id || "");
          setIsRepayOpen(true);
        }}
      />

      {/* 2-Column Claims & Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Outstanding Claims (Lent vs Borrowed) */}
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-heading font-semibold text-foreground">
              Active Financial Claims
            </h2>
            <span className="text-xs text-muted-foreground">
              {contactClaims.length} recorded claim{contactClaims.length === 1 ? "" : "s"}
            </span>
          </div>

          {contactClaims.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 bg-card/40 p-6 text-center space-y-2">
              <HandCoins className="size-6 text-muted-foreground/50 mx-auto" />
              <p className="text-xs text-muted-foreground">
                No active loan or shared bill claims with {contact.displayName}.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Money Lent Section */}
              {receivableClaims.length > 0 && (
                <div className="space-y-2.5">
                  <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
                    Money Lent (Receivables Owed to You)
                  </span>
                  <div className="space-y-2.5">
                    {receivableClaims.map((claim) => (
                      <ClaimCard
                        key={claim.id}
                        claim={claim}
                        onSettle={(c) => {
                          setSelectedClaimId(c.id);
                          setIsRepayOpen(true);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Money Borrowed Section */}
              {payableClaims.length > 0 && (
                <div className="space-y-2.5">
                  <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">
                    Money Borrowed (Payables You Owe)
                  </span>
                  <div className="space-y-2.5">
                    {payableClaims.map((claim) => (
                      <ClaimCard
                        key={claim.id}
                        claim={claim}
                        onSettle={(c) => {
                          setSelectedClaimId(c.id);
                          setIsRepayOpen(true);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Activity History Timeline */}
        <div className="space-y-3">
          <h2 className="text-base font-heading font-semibold text-foreground">
            Financial Relationship Activity
          </h2>
          <ContactActivityTimeline events={activities} contactName={contact.displayName} />
        </div>
      </div>

      {/* Edit Contact Modal */}
      <ContactModal
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        contact={contact}
        onSuccess={(data) => {
          setContact((prev) => ({
            ...prev,
            displayName: data.displayName,
            notes: data.notes,
            isRoommate: data.isRoommate,
            archived: data.archived,
          }));
        }}
      />

      {/* Lend / Borrow Modal */}
      <LendBorrowModal
        open={isLendBorrowOpen}
        onOpenChange={setIsLendBorrowOpen}
        defaultKind={lendBorrowKind}
        defaultContactId={contact.id}
        contacts={PREVIEW_CONTACTS}
      />

      {/* Repayment Modal */}
      <RepaymentModal
        open={isRepayOpen}
        onOpenChange={setIsRepayOpen}
        defaultClaimId={selectedClaimId}
        claims={PREVIEW_CLAIMS}
      />
    </div>
  );
}
