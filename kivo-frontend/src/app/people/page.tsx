"use client";

import * as React from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { ContactList } from "@/features/people/components/ContactList";
import { ContactModal } from "@/features/people/components/ContactModal";
import { LendBorrowModal } from "@/features/lending/components/LendBorrowModal";
import { RepaymentModal } from "@/features/lending/components/RepaymentModal";
import { PREVIEW_CONTACTS } from "@/features/people/data/previewContacts";
import { PREVIEW_CLAIMS } from "@/features/lending/data/previewLoans";
import {
  Users,
  HandCoins,
  ArrowDownLeft,
  ArrowUpRight,
  UserPlus,
  Eye,
  Inbox,
  Loader2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ContactEntity } from "@/features/people/types";

export default function PeoplePage() {
  const [viewMode, setViewMode] = React.useState<"populated" | "empty" | "loading">("populated");
  const [contacts, setContacts] = React.useState<ContactEntity[]>(PREVIEW_CONTACTS);
  const [isAddContactOpen, setIsAddContactOpen] = React.useState(false);
  const [isLendBorrowOpen, setIsLendBorrowOpen] = React.useState(false);
  const [lendBorrowKind, setLendBorrowKind] = React.useState<"lend" | "borrow">("lend");
  const [isRepayOpen, setIsRepayOpen] = React.useState(false);

  const displayedContacts = React.useMemo(() => {
    if (viewMode === "empty") return [];
    return contacts;
  }, [contacts, viewMode]);

  // Total receivables & payables
  const totalReceivables = React.useMemo(() => {
    return displayedContacts.reduce((sum, c) => sum + c.receivablePaise, 0);
  }, [displayedContacts]);

  const totalPayables = React.useMemo(() => {
    return displayedContacts.reduce((sum, c) => sum + c.payablePaise, 0);
  }, [displayedContacts]);

  const activeContactsCount = React.useMemo(() => {
    return displayedContacts.filter((c) => !c.archived).length;
  }, [displayedContacts]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <PageContainer className="py-6 sm:py-8 space-y-6">
        {/* Header & View Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground tracking-tight">
              Friends & Contacts
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage personal relationships, track money lent, borrowing, and shared balances.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Switcher for visual verification */}
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
              onClick={() => setIsAddContactOpen(true)}
              className="bg-kivo-primary hover:bg-kivo-brand-dark text-white gap-1.5 text-xs font-medium"
            >
              <UserPlus className="size-4" />
              <span>Add Contact</span>
            </Button>
          </div>
        </div>

        {/* 4 Financial Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Total Contacts */}
          <div className="rounded-xl border border-border/80 bg-card p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Active Contacts
              </span>
              <Users className="size-4" />
            </div>
            <div className="text-2xl font-bold font-heading text-foreground">
              {activeContactsCount}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Personal records (no Kivo account needed)
            </p>
          </div>

          {/* 2. Total Lent (Receivable) */}
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-900/60 p-4 space-y-1">
            <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Money Lent (Receivable)
              </span>
              <ArrowDownLeft className="size-4 text-emerald-600" />
            </div>
            <MoneyAmount paise={totalReceivables} size="2xl" variant="income" />
            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400">
              Recoverable asset owed to you by friends
            </p>
          </div>

          {/* 3. Total Borrowed (Payable) */}
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900/60 p-4 space-y-1">
            <div className="flex items-center justify-between text-amber-800 dark:text-amber-300">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Money Borrowed (Payable)
              </span>
              <ArrowUpRight className="size-4 text-amber-700" />
            </div>
            <MoneyAmount paise={totalPayables} size="2xl" variant="reserved" />
            <p className="text-[11px] text-amber-800/80 dark:text-amber-400">
              Liabilities you owe to friends
            </p>
          </div>

          {/* 4. Quick Actions */}
          <div className="rounded-xl border border-border/80 bg-card p-4 flex flex-col justify-between space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Quick Operations
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLendBorrowKind("lend");
                  setIsLendBorrowOpen(true);
                }}
                className="text-xs flex-1 gap-1 h-8"
              >
                <HandCoins className="size-3 text-emerald-600" />
                <span>Lend</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLendBorrowKind("borrow");
                  setIsLendBorrowOpen(true);
                }}
                className="text-xs flex-1 gap-1 h-8"
              >
                <ArrowDownLeft className="size-3 text-amber-600" />
                <span>Borrow</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Financial Rules Invariant Callout */}
        <div className="rounded-xl border border-border/80 bg-muted/20 p-4 text-xs flex items-start gap-3">
          <Info className="size-4.5 text-kivo-secondary shrink-0 mt-0.5" />
          <div className="space-y-1 leading-normal">
            <span className="font-semibold text-foreground block">
              Fundamental Accounting Invariant: Lending is Not Spending; Borrowing is Not Income
            </span>
            <p className="text-muted-foreground text-[11px]">
              When you lend money to a friend, your cash moves into a receivable asset, preserving
              your net equity. When you borrow money, your cash increases alongside an offsetting
              payable liability. Kivo never distorts your personal expenses or income reports with
              lending activities.
            </p>
          </div>
        </div>

        {/* Contact List / Loading / Empty */}
        {viewMode === "loading" ? (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="h-6 w-48 bg-muted rounded animate-pulse" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 w-full bg-muted/40 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        ) : (
          <ContactList
            contacts={displayedContacts}
            onAddContact={() => setIsAddContactOpen(true)}
          />
        )}
      </PageContainer>

      {/* Add Contact Modal */}
      <ContactModal
        open={isAddContactOpen}
        onOpenChange={setIsAddContactOpen}
        onSuccess={(data) => {
          const newContact: ContactEntity = {
            id: `c-new-${Date.now()}`,
            displayName: data.displayName,
            notes: data.notes,
            isRoommate: data.isRoommate,
            archived: false,
            createdAt: new Date().toISOString(),
            receivablePaise: 0,
            payablePaise: 0,
          };
          setContacts((prev) => [newContact, ...prev]);
        }}
      />

      {/* Lend / Borrow Modal */}
      <LendBorrowModal
        open={isLendBorrowOpen}
        onOpenChange={setIsLendBorrowOpen}
        defaultKind={lendBorrowKind}
        contacts={contacts}
      />

      {/* Repayment Modal */}
      <RepaymentModal open={isRepayOpen} onOpenChange={setIsRepayOpen} claims={PREVIEW_CLAIMS} />
    </div>
  );
}
