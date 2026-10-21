"use client";

import * as React from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { SafeToSpendCard } from "@/features/rent/components/SafeToSpendCard";
import { RentOverviewCard } from "@/features/rent/components/RentOverviewCard";
import { RentObligationList } from "@/features/rent/components/RentObligationList";
import { RentReserveCard } from "@/features/rent/components/RentReserveCard";
import { RentPaymentModal } from "@/features/rent/components/RentPaymentModal";
import { RentPlanConfigModal } from "@/features/rent/components/RentPlanConfigModal";
import { RentReserveModal } from "@/features/rent/components/RentReserveModal";
import { ObligationActionModal } from "@/features/rent/components/ObligationActionModal";
import {
  PREVIEW_RENT_PLAN,
  PREVIEW_RENT_OBLIGATIONS,
  PREVIEW_RENT_RESERVES,
  PREVIEW_SPENDING_CAPACITY,
} from "@/features/rent/data/previewRent";
import { PREVIEW_CONTACTS } from "@/features/people/data/previewContacts";
import { ShieldCheck, PlusCircle, Eye, Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  RentPlanEntity,
  RentObligationEntity,
  RentReserveEntity,
  SpendingCapacityEntity,
} from "@/features/rent/types";

export default function RentPage() {
  const [viewMode, setViewMode] = React.useState<"populated" | "empty" | "loading">("populated");

  const [plan, setPlan] = React.useState<RentPlanEntity>(PREVIEW_RENT_PLAN);
  const [obligations, setObligations] =
    React.useState<RentObligationEntity[]>(PREVIEW_RENT_OBLIGATIONS);
  const [reserves, setReserves] = React.useState<RentReserveEntity[]>(PREVIEW_RENT_RESERVES);
  const [spendingCapacity, setSpendingCapacity] =
    React.useState<SpendingCapacityEntity>(PREVIEW_SPENDING_CAPACITY);

  // Modal states
  const [isPaymentOpen, setIsPaymentOpen] = React.useState(false);
  const [selectedObligation, setSelectedObligation] = React.useState<RentObligationEntity | null>(
    null
  );

  const [isPlanConfigOpen, setIsPlanConfigOpen] = React.useState(false);

  const [isReserveModalOpen, setIsReserveModalOpen] = React.useState(false);
  const [selectedReserve, setSelectedReserve] = React.useState<RentReserveEntity | null>(null);

  const [isActionModalOpen, setIsActionModalOpen] = React.useState(false);
  const [actionKind, setActionKind] = React.useState<"skip" | "reopen">("skip");

  const currentObligation = React.useMemo(() => {
    return (
      obligations.find(
        (o) => o.status === "upcoming" || o.status === "due" || o.status === "overdue"
      ) || obligations[0]
    );
  }, [obligations]);

  const displayedObligations = React.useMemo(() => {
    if (viewMode === "empty") return [];
    return obligations;
  }, [obligations, viewMode]);

  const displayedReserves = React.useMemo(() => {
    if (viewMode === "empty") return [];
    return reserves;
  }, [reserves, viewMode]);

  const displayedCapacity: SpendingCapacityEntity = React.useMemo(() => {
    if (viewMode === "empty") {
      return {
        liquidBalancePaise: 4500000,
        activeReservesPaise: 0,
        safeToSpendPaise: 4500000,
      };
    }
    return spendingCapacity;
  }, [spendingCapacity, viewMode]);

  const handleRecordPayment = (ob: RentObligationEntity) => {
    setSelectedObligation(ob);
    setIsPaymentOpen(true);
  };

  const handleSkipObligation = (ob: RentObligationEntity) => {
    setSelectedObligation(ob);
    setActionKind("skip");
    setIsActionModalOpen(true);
  };

  const handleReopenObligation = (ob: RentObligationEntity) => {
    setSelectedObligation(ob);
    setActionKind("reopen");
    setIsActionModalOpen(true);
  };

  const handleAdjustReserve = (res: RentReserveEntity) => {
    setSelectedReserve(res);
    setIsReserveModalOpen(true);
  };

  const handleCreateReserve = () => {
    setSelectedReserve(null);
    setIsReserveModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <PageContainer className="py-6 sm:py-8 space-y-6">
        {/* Header & View Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground tracking-tight">
              Monthly Rent & Reserves
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage apartment rent plans, monthly dues, and ring-fence cash into rent reserves to
              protect Safe-to-Spend.
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
              onClick={() => setIsPlanConfigOpen(true)}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Configure Plan
            </Button>
          </div>
        </div>

        {/* Loading Skeleton */}
        {viewMode === "loading" ? (
          <div className="space-y-6">
            <div className="h-44 w-full bg-card border border-border rounded-2xl animate-pulse" />
            <div className="h-60 w-full bg-card border border-border rounded-2xl animate-pulse" />
          </div>
        ) : (
          <>
            {/* 1. Safe-to-Spend & Spending Capacity Hero */}
            <SafeToSpendCard capacity={displayedCapacity} onAddReserve={handleCreateReserve} />

            {/* 2. Rent Overview Card (Current Obligation) */}
            <RentOverviewCard
              plan={plan}
              currentObligation={currentObligation}
              onRecordPayment={handleRecordPayment}
              onConfigurePlan={() => setIsPlanConfigOpen(true)}
              onSkipObligation={handleSkipObligation}
            />

            {/* 3. Rent Reserves Earmarks Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-heading font-semibold text-foreground flex items-center gap-2">
                    <ShieldCheck className="size-4.5 text-amber-700" />
                    <span>Active Rent Reserve Earmarks</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Ring-fenced allocations protecting your liquid balance for upcoming rent cycles
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCreateReserve}
                  className="text-xs gap-1.5"
                >
                  <PlusCircle className="size-3.5" />
                  <span>New Reserve</span>
                </Button>
              </div>

              {displayedReserves.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/80 bg-card/40 p-6 text-center space-y-2">
                  <ShieldCheck className="size-6 text-muted-foreground/50 mx-auto" />
                  <p className="text-xs text-muted-foreground">
                    No active rent reserves earmarked. Add a reserve to ring-fence liquid cash for
                    next month&apos;s rent.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {displayedReserves.map((res) => (
                    <RentReserveCard key={res.id} reserve={res} onAdjust={handleAdjustReserve} />
                  ))}
                </div>
              )}
            </div>

            {/* 4. Monthly Obligations History */}
            <RentObligationList
              obligations={displayedObligations}
              onRecordPayment={handleRecordPayment}
              onSkip={handleSkipObligation}
              onReopen={handleReopenObligation}
            />
          </>
        )}
      </PageContainer>

      {/* Rent Payment Modal */}
      <RentPaymentModal
        open={isPaymentOpen}
        onOpenChange={setIsPaymentOpen}
        obligation={selectedObligation}
        roommates={PREVIEW_CONTACTS.filter((c) => c.isRoommate)}
        onSuccess={() => {
          if (selectedObligation) {
            setObligations((prev) =>
              prev.map((o) =>
                o.id === selectedObligation.id
                  ? { ...o, status: "paid", paidPaise: o.amountPaise, outstandingPaise: 0 }
                  : o
              )
            );
          }
        }}
      />

      {/* Rent Plan Config Modal */}
      <RentPlanConfigModal
        open={isPlanConfigOpen}
        onOpenChange={setIsPlanConfigOpen}
        plan={plan}
        roommates={PREVIEW_CONTACTS}
        onSuccess={(data) => {
          setPlan((prev) => ({
            ...prev,
            title: data.title,
            payee: data.payee,
            startDate: data.startDate,
            dueDay: data.dueDayRule === "fixed_day" ? (data.dueDay ?? 5) : null,
            amountPaise: Math.round(parseFloat(data.amount) * 100),
          }));
        }}
      />

      {/* Rent Reserve Modal (Create / Adjust) */}
      <RentReserveModal
        open={isReserveModalOpen}
        onOpenChange={setIsReserveModalOpen}
        reserve={selectedReserve}
        obligations={obligations}
        onSuccess={() => {
          setReserves((prev) => [...prev]);
          setSpendingCapacity((prev) => ({ ...prev }));
        }}
      />

      {/* Obligation Action Modal (Skip / Reopen) */}
      <ObligationActionModal
        open={isActionModalOpen}
        onOpenChange={setIsActionModalOpen}
        obligation={selectedObligation}
        action={actionKind}
        onSuccess={() => {
          if (selectedObligation) {
            setObligations((prev) =>
              prev.map((o) =>
                o.id === selectedObligation.id
                  ? {
                      ...o,
                      status: actionKind === "skip" ? "skipped" : "upcoming",
                      reason: actionKind === "skip" ? "Skipped by user" : undefined,
                    }
                  : o
              )
            );
          }
        }}
      />
    </div>
  );
}
