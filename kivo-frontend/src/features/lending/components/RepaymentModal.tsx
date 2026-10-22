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
import { IntegrationPendingBadge } from "@/components/shared/IntegrationPendingBadge";
import { settlementSchema, type SettlementFormData } from "../schemas/settlement.schema";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { paiseToDecimalString } from "@/lib/formatters/currency";
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
  claims?: ClaimEntity[];
  accounts?: AccountOption[];
  onSuccess?: (data: SettlementFormData) => void;
}

const DEFAULT_ACCOUNTS: AccountOption[] = [
  { id: "acc-bank-1", name: "HDFC Primary Bank Account" },
  { id: "acc-cash-1", name: "Physical Cash Wallet" },
  { id: "acc-wallet-1", name: "Digital Wallet" },
];

export function RepaymentModal({
  open,
  onOpenChange,
  defaultClaimId = "",
  claims = [],
  accounts = DEFAULT_ACCOUNTS,
  onSuccess,
}: RepaymentModalProps) {
  const [selectedClaimId, setSelectedClaimId] = React.useState<string>(defaultClaimId);
  const [pendingNotice, setPendingNotice] = React.useState<string | null>(null);

  const effectiveClaimId = selectedClaimId || defaultClaimId;
  const selectedClaim = React.useMemo(() => {
    return claims.find((c) => c.id === effectiveClaimId);
  }, [claims, effectiveClaimId]);

  const isReceivable = selectedClaim?.direction === "receivable";

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SettlementFormData>({
    resolver: zodResolver(settlementSchema),
    values: {
      claimId: effectiveClaimId,
      accountId: accounts[0]?.id || "",
      amount: selectedClaim ? paiseToDecimalString(selectedClaim.outstandingPaise) : "",
      effectiveDate: "2026-10-20",
      title: selectedClaim ? `Repayment for ${selectedClaim.title}` : "Loan Repayment",
      notes: "",
      paymentMethod: "UPI",
    },
    resetOptions: {
      keepDirtyValues: true,
    },
  });

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setPendingNotice(null);
    }
    onOpenChange(isOpen);
  };

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
    const actionLabel = isReceivable
      ? `Repayment received from ${selectedClaim?.contactName || "Contact"}`
      : `Repayment paid to ${selectedClaim?.contactName || "Contact"}`;

    setPendingNotice(
      `${actionLabel} (₹${data.amount}) validated. In Phase 7 integration, this will post to Django /api/v1/settlements/.`
    );

    if (onSuccess) {
      onSuccess(data);
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
                ? "This transaction recovers your asset (increases cash, reduces receivable). It is not taxable or disposable income."
                : "This transaction settles an existing liability (decreases cash, eliminates payable). It was already recorded when incurred."}
            </span>
          </div>
        </div>

        {pendingNotice && (
          <div className="rounded-lg border border-kivo-sage/50 bg-kivo-sage/15 p-3 text-xs text-kivo-brand-dark dark:text-kivo-sage space-y-1">
            <div className="flex items-center gap-1.5 font-medium">
              <IntegrationPendingBadge />
              <span>Settlement Recorded in Frontend</span>
            </div>
            <p className="text-[11px] opacity-90">{pendingNotice}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 py-1">
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
                .filter((c) => c.status !== "settled" && c.status !== "cancelled")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.direction === "receivable" ? "[Owed to you]" : "[You owe]"} {c.contactName} -{" "}
                    {c.title} (₹{(c.outstandingPaise / 100).toFixed(2)})
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
        </form>
      </DialogContent>
    </Dialog>
  );
}
