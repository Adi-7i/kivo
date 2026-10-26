"use client";

import * as React from "react";
import { StepNavigation } from "./StepNavigation";
import { Button } from "@/components/ui/button";
import { formatInr, parseDecimalStringToPaise } from "@/lib/formatters/currency";
import { formatDateDisplay } from "@/lib/formatters/date";
import { User, CreditCard, Edit2, ShieldAlert } from "lucide-react";
import type { OnboardingPersonalData, OnboardingAccountData } from "../types";

interface SetupSummaryStepProps {
  personal: OnboardingPersonalData;
  account: Partial<OnboardingAccountData>;
  onBack: () => void;
  onEditStep: (stepNumber: number) => void;
  onComplete: () => void;
  isSubmitting?: boolean;
  recoveryPending?: boolean;
  canRetry?: boolean;
}

export function SetupSummaryStep({
  personal,
  account,
  onBack,
  onEditStep,
  onComplete,
  isSubmitting = false,
  recoveryPending = false,
  canRetry = false,
}: SetupSummaryStepProps) {
  // Safe balance display
  const balancePaise = React.useMemo(() => {
    if (!account.openingBalance) return 0;
    return parseDecimalStringToPaise(account.openingBalance);
  }, [account.openingBalance]);

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Setup Summary
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Review your configured details before initializing your Kivo workspace.
        </p>
      </div>

      {/* Profile summary card */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
          <div className="flex items-center gap-2">
            <User className="size-4 text-kivo-primary" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Profile & Regional Setup
            </h3>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => onEditStep(2)}
            disabled={isSubmitting || recoveryPending}
            className="text-xs text-kivo-primary hover:text-kivo-secondary gap-1"
          >
            <Edit2 className="size-3" />
            <span>Edit</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px]">Display Name</span>
            <span className="font-semibold text-foreground">
              {personal.displayName || "Not specified"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Base Currency</span>
            <span className="font-semibold text-foreground">{personal.currency} (₹)</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Timezone</span>
            <span className="font-semibold text-foreground">{personal.timezone}</span>
          </div>
        </div>
      </div>

      {/* Account summary card */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
          <div className="flex items-center gap-2">
            <CreditCard className="size-4 text-kivo-primary" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Primary Money Account
            </h3>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => onEditStep(3)}
            disabled={isSubmitting || recoveryPending}
            className="text-xs text-kivo-primary hover:text-kivo-secondary gap-1"
          >
            <Edit2 className="size-3" />
            <span>Edit</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px]">Account Name</span>
            <span className="font-semibold text-foreground">
              {account.accountName || "Unnamed Account"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Type</span>
            <span className="font-semibold capitalize text-foreground">
              {account.accountType || "bank"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Opening Balance</span>
            <span className="font-semibold text-foreground font-tabular">
              {formatInr(balancePaise)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Opening Date</span>
            <span className="font-semibold text-foreground">
              {account.openingDate ? formatDateDisplay(account.openingDate) : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Data policy disclaimer */}
      <div className="flex items-start gap-2.5 rounded-lg border border-border/80 bg-muted/40 p-3 text-xs text-muted-foreground">
        <ShieldAlert className="size-4 shrink-0 text-muted-foreground mt-0.5" />
        <p className="text-[11px] leading-relaxed">
          Review these details before creating your account. The opening balance is recorded in your
          account history.
        </p>
      </div>

      <StepNavigation
        onBack={onBack}
        onNext={onComplete}
        nextLabel={recoveryPending ? "Retry original request" : "Complete Setup"}
        isNextDisabled={recoveryPending && !canRetry}
        isBackDisabled={recoveryPending}
        isFinalStep
        isLoading={isSubmitting}
      />
    </div>
  );
}
