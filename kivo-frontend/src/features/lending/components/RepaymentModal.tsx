"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/utils/zodResolver";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/features/auth/components/FieldError";
import { useFinancialWrite, FinancialWriteStatus } from "@/features/finance/useFinancialWrite";
import { QueryState } from "@/features/finance/QueryState";
import { normalizeOpeningBalance } from "@/features/onboarding/money";
import { useTodayInKolkata } from "@/features/relationships/useToday";
import { useAccounts } from "@/features/finance/queries";
import { useContacts, useClaims } from "@/features/relationships/queries";
import { claimEntity, type SettlementInput } from "@/features/relationships/api";
import type { EventDTO } from "@/features/finance/api";
import { settlementSchema, type SettlementFormData } from "../schemas/settlement.schema";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { paiseToDecimalString, formatInr } from "@/lib/formatters/currency";
import { ArrowLeftRight, Info } from "lucide-react";
import type { ClaimEntity } from "../types";

interface AccountOption {
  id: string;
  name: string;
}

interface RepaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClaimId?: string;
  initialEvent?: EventDTO;
  claims?: ClaimEntity[];
  accounts?: AccountOption[];
  onSuccess?: (data: SettlementFormData) => void;
}

export function RepaymentModal({
  open,
  onOpenChange,
  defaultClaimId = "",
  initialEvent,
  onSuccess,
}: RepaymentModalProps) {
  const claimQuery = useClaims(open),
    contactQuery = useContacts(open),
    accountQuery = useAccounts(open);
  const claims = (claimQuery.data ?? []).map((c) => claimEntity(c, contactQuery.data ?? [])),
    accounts = (accountQuery.data ?? []).filter((a) => !a.archived);
  const initialClaim =
    initialEvent?.financial_effects.find((p) => p.claim)?.claim ?? defaultClaimId;
  const [selectedClaimId, setSelectedClaimId] = React.useState(initialClaim);
  const today = useTodayInKolkata(),
    write = useFinancialWrite(
      initialEvent ? `settlement:${initialEvent.id}:correct` : "settlement:create",
      true
    );

  const effectiveClaimId = selectedClaimId || defaultClaimId;
  const selectedClaim = React.useMemo(() => {
    return claims.find((c) => c.id === effectiveClaimId);
  }, [claims, effectiveClaimId]);

  const isReceivable = selectedClaim?.direction === "receivable";

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SettlementFormData>({
    resolver: zodResolver(settlementSchema),
    values: {
      claimId: effectiveClaimId,
      accountId: initialEvent?.account ?? accounts[0]?.id ?? "",
      amount:
        initialEvent?.amount ??
        (selectedClaim ? paiseToDecimalString(selectedClaim.outstandingPaise) : ""),
      effectiveDate: initialEvent?.effective_date ?? today,
      title:
        initialEvent?.title ??
        (selectedClaim ? `Repayment for ${selectedClaim.title}` : "Loan Repayment"),
      notes: initialEvent?.notes ?? "",
      paymentMethod: initialEvent?.payment_method ?? "UPI",
      reason: "",
    },
    resetOptions: {
      keepDirtyValues: true,
    },
  });

  const handleOpenChange = onOpenChange;

  const handleClaimChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const claimId = e.target.value;
    setSelectedClaimId(claimId);
    setValue("claimId", claimId);

    const found = claims.find((c) => c.id === claimId);
    if (found) {
      setValue("amount", paiseToDecimalString(found.outstandingPaise));
      setValue("title", `Repayment for ${found.title}`);
    }
  };

  const onSubmit = async (data: SettlementFormData) => {
    if (initialEvent && data.reason.trim().length < 5) {
      setError("reason", { message: "An audit reason of at least 5 characters is required" });
      return;
    }
    const body: SettlementInput = {
      claim: data.claimId,
      account: data.accountId,
      amount: normalizeOpeningBalance(data.amount),
      effective_date: data.effectiveDate,
      title: data.title,
      notes: data.notes,
      payment_method: data.paymentMethod,
    };
    const result = await write.run<EventDTO>(
      initialEvent ? `/api/v1/settlements/${initialEvent.id}/correct/` : "/api/v1/settlements/",
      initialEvent ? { ...body, reason: data.reason } : body
    );
    if (result) {
      onSuccess?.(data);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
            <ArrowLeftRight className="size-5 text-kivo-primary" />
            <span>Record Loan Repayment</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Settle or partially repay an active loan or shared-expense claim.
          </DialogDescription>
        </DialogHeader>

        {/* Selected Claim Highlight */}
        {selectedClaim && (
          <div className="rounded-lg border border-border/80 bg-muted/30 p-3 space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">{selectedClaim.title}</span>
              <span className="text-[11px] font-mono text-muted-foreground">
                {selectedClaim.contactName}
              </span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground pt-0.5">
              <span>
                Original: <MoneyAmount paise={selectedClaim.principalPaise} size="xs" />
              </span>
              <div className="flex items-center gap-1 font-medium">
                <span>Remaining:</span>
                <MoneyAmount
                  paise={selectedClaim.outstandingPaise}
                  size="sm"
                  variant={isReceivable ? "income" : "reserved"}
                />
              </div>
            </div>
          </div>
        )}

        {/* Financial Invariant Notice */}
        <div
          className={`rounded-lg border p-3 text-xs flex items-start gap-2 ${
            isReceivable
              ? "border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300"
              : "border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300"
          }`}
        >
          <Info className="size-4 shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-tight">
            <span className="font-semibold block">
              {isReceivable
                ? "Repayment received is NOT fresh income"
                : "Repayment paid is NOT a second expense"}
            </span>
            <span className="text-[11px] opacity-90">
              {isReceivable
                ? "This transaction recovers your asset (increases cash, reduces receivable). It is not recognized as fresh income in Kivo."
                : "This transaction settles an existing liability (decreases cash, eliminates payable). It was already recorded when incurred."}
            </span>
          </div>
        </div>

        <FinancialWriteStatus write={write} onConfirmed={() => onOpenChange(false)} />

        <QueryState query={claimQuery} />
        <QueryState query={contactQuery} />
        <QueryState query={accountQuery} />
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 py-1">
          <fieldset disabled={write.busy || write.pending} className="space-y-3.5 min-w-0">
            {initialEvent && (
              <div className="space-y-1.5">
                <Label htmlFor="relationship-reason">Audit Reason</Label>
                <Input id="relationship-reason" {...register("reason")} />
                {errors.reason && <FieldError message={errors.reason.message} />}
              </div>
            )}
            {/* Claim Selection */}
            <div className="space-y-1.5">
              <Label htmlFor="settlement-claim" className="text-xs font-medium">
                Select Active Claim to Settle <span className="text-destructive">*</span>
              </Label>
              <select
                id="settlement-claim"
                value={selectedClaimId}
                onChange={handleClaimChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
              >
                <option value="">-- Choose an open claim --</option>
                {claims
                  .filter(
                    (c) =>
                      c.id === effectiveClaimId ||
                      (c.status !== "settled" && c.status !== "cancelled")
                  )
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.direction === "receivable" ? "[Owed to you]" : "[You owe]"} {c.contactName}{" "}
                      - {c.title} ({formatInr(c.outstandingPaise)})
                    </option>
                  ))}
              </select>
              {errors.claimId && <FieldError message={errors.claimId.message} />}
            </div>

            {/* Amount & Account */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="settlement-amount" className="text-xs font-medium">
                  Settlement Amount (₹) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="settlement-amount"
                  type="text"
                  placeholder="e.g. 1500"
                  {...register("amount")}
                  className="text-sm font-mono"
                />
                {errors.amount && <FieldError message={errors.amount.message} />}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="settlement-account" className="text-xs font-medium">
                  {isReceivable ? "Receiving Account" : "Paying Account"}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <select
                  id="settlement-account"
                  {...register("accountId")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
                {errors.accountId && <FieldError message={errors.accountId.message} />}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="settlement-title" className="text-xs font-medium">
                Description <span className="text-destructive">*</span>
              </Label>
              <Input id="settlement-title" {...register("title")} className="text-sm" />
              {errors.title && <FieldError message={errors.title.message} />}
            </div>

            {/* Date & Payment Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="settlement-date" className="text-xs font-medium">
                  Settlement Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="settlement-date"
                  type="date"
                  {...register("effectiveDate")}
                  className="text-sm"
                />
                {errors.effectiveDate && <FieldError message={errors.effectiveDate.message} />}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="settlement-method" className="text-xs font-medium">
                  Payment Method
                </Label>
                <select
                  id="settlement-method"
                  {...register("paymentMethod")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
                >
                  <option value="UPI">UPI</option>
                  <option value="Cash">Physical Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/50">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-kivo-primary hover:bg-kivo-brand-dark text-white font-medium"
              >
                Record Repayment
              </Button>
            </div>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
