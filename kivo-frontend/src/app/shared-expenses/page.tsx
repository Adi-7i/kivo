"use client";

import * as React from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { SharedBillList } from "@/features/shared-expenses/components/SharedBillList";
import { CreateSharedBillModal } from "@/features/shared-expenses/components/CreateSharedBillModal";
import { PREVIEW_SHARED_BILLS } from "@/features/shared-expenses/data/previewSharedBills";
import { PREVIEW_CONTACTS } from "@/features/people/data/previewContacts";
import {
  Users,
  Receipt,
  PlusCircle,
  Eye,
  Inbox,
  Loader2,
  Info,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SharedBillEntity } from "@/features/shared-expenses/types";

export default function SharedExpensesPage() {
  const [viewMode, setViewMode] = React.useState<"populated" | "empty" | "loading">("populated");
  const [bills, setBills] = React.useState<SharedBillEntity[]>(PREVIEW_SHARED_BILLS);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);

  const displayedBills = React.useMemo(() => {
    if (viewMode === "empty") return [];
    return bills;
  }, [bills, viewMode]);

  // Aggregates
  const totalGrossPaise = React.useMemo(() => {
    return displayedBills.reduce((sum, b) => sum + b.amountPaise, 0);
  }, [displayedBills]);

  const totalUserSharePaise = React.useMemo(() => {
    return displayedBills.reduce((sum, b) => sum + b.userSharePaise, 0);
  }, [displayedBills]);

  const totalReceivablesFromSharing = React.useMemo(() => {
    return displayedBills
      .filter((b) => b.payerContactId === null)
      .reduce((sum, b) => sum + (b.amountPaise - b.userSharePaise), 0);
  }, [displayedBills]);

  const totalPayablesFromSharing = React.useMemo(() => {
    return displayedBills
      .filter((b) => b.payerContactId !== null && b.status !== "all_settled")
      .reduce((sum, b) => sum + b.userSharePaise, 0);
  }, [displayedBills]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <PageContainer className="py-6 sm:py-8 space-y-6">
        {/* Header & View Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground tracking-tight">
              Shared Expenses & Bills
            </h1>
            <p className="text-sm text-muted-foreground">
              Split group dining, groceries, and flat expenses with friends. Accurately separate
              your personal expenses from friends&apos; shares.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Switcher for verification */}
            <div className="flex items-center rounded-lg border border-border bg-card p-1 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("populated")}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                  viewMode === "populated"
                    ? "bg-kivo-primary text-white font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Eye className="size-3" />
                <span>Populated</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("empty")}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                  viewMode === "empty"
                    ? "bg-kivo-primary text-white font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Inbox className="size-3" />
                <span>Honest Empty</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("loading")}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                  viewMode === "loading"
                    ? "bg-kivo-primary text-white font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Loader2 className="size-3" />
                <span>Skeleton</span>
              </button>
            </div>

            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-kivo-primary hover:bg-kivo-brand-dark text-white gap-1.5 text-xs font-medium"
            >
              <PlusCircle className="size-4" />
              <span>Create Shared Bill</span>
            </Button>
          </div>
        </div>

        {/* 4 Financial Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Cumulative Gross Bills */}
          <div className="rounded-xl border border-border/80 bg-card p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Gross Bills Total
              </span>
              <Receipt className="size-4" />
            </div>
            <MoneyAmount paise={totalGrossPaise} size="2xl" variant="default" />
            <p className="text-[11px] text-muted-foreground">
              Total face amount across {displayedBills.length} shared events
            </p>
          </div>

          {/* 2. Your Personal Share (Actual Expense) */}
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 dark:bg-destructive/10 p-4 space-y-1">
            <div className="flex items-center justify-between text-destructive dark:text-destructive-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Your Personal Share
              </span>
              <Users className="size-4" />
            </div>
            <MoneyAmount paise={totalUserSharePaise} size="2xl" variant="expense" />
            <p className="text-[11px] text-muted-foreground">
              Actual personal consumption recognized in budget
            </p>
          </div>

          {/* 3. Receivables from Friends */}
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-900/60 p-4 space-y-1">
            <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Receivables from Friends
              </span>
              <ArrowDownLeft className="size-4 text-emerald-600" />
            </div>
            <MoneyAmount paise={totalReceivablesFromSharing} size="2xl" variant="income" />
            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400">
              Recoverable advances you paid on friends&apos; behalf
            </p>
          </div>

          {/* 4. Payables to Friends */}
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900/60 p-4 space-y-1">
            <div className="flex items-center justify-between text-amber-800 dark:text-amber-300">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Payables to Friends
              </span>
              <ArrowUpRight className="size-4 text-amber-700" />
            </div>
            <MoneyAmount paise={totalPayablesFromSharing} size="2xl" variant="reserved" />
            <p className="text-[11px] text-amber-800/80 dark:text-amber-400">
              Liabilities for bills friends paid for you
            </p>
          </div>
        </div>

        {/* Financial Rules Invariant Callout */}
        <div className="rounded-xl border border-border/80 bg-muted/20 p-4 text-xs flex items-start gap-3">
          <Info className="size-4.5 text-kivo-secondary shrink-0 mt-0.5" />
          <div className="space-y-1 leading-normal">
            <span className="font-semibold text-foreground block">
              Shared Expense Law: Personal Expense is Decoupled from Upfront Payment
            </span>
            <p className="text-muted-foreground text-[11px]">
              When you pay a ₹6,000 grocery bill split with a flatmate, only your ₹3,000 share is a
              personal expense. The remaining ₹3,000 creates a receivable asset. Similarly, when a
              friend pays for your dinner, your share recognizes an expense and payable immediately
              without reducing your liquid bank balance.
            </p>
          </div>
        </div>

        {/* List / Loading / Empty */}
        {viewMode === "loading" ? (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="h-6 w-48 bg-muted rounded animate-pulse" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 w-full bg-muted/40 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        ) : (
          <SharedBillList bills={displayedBills} onCreateBill={() => setIsCreateOpen(true)} />
        )}
      </PageContainer>

      {/* Create Shared Bill Modal */}
      <CreateSharedBillModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        contacts={PREVIEW_CONTACTS}
        onSuccess={(data) => {
          const gross = Math.round(parseFloat(data.amount) * 100);
          const newBill: SharedBillEntity = {
            id: `bill-new-${Date.now()}`,
            title: data.title,
            amountPaise: gross,
            category: data.category,
            effectiveDate: data.effectiveDate,
            payerContactId: data.payerType === "user" ? null : data.payerContactId,
            payerName:
              data.payerType === "user"
                ? "You"
                : PREVIEW_CONTACTS.find((c) => c.id === data.payerContactId)?.displayName ||
                  "Friend",
            splitMethod: data.splitMethod,
            userSharePaise: Math.round(gross / (data.selectedParticipants.length + 1)),
            notes: data.notes,
            merchant: data.merchant,
            status: "unsettled",
            createdAt: new Date().toISOString(),
            shares: [
              {
                contactId: null,
                displayName: "You",
                amountPaise: Math.round(gross / (data.selectedParticipants.length + 1)),
                status: "open",
              },
            ],
          };
          setBills((prev) => [newBill, ...prev]);
        }}
      />
    </div>
  );
}
