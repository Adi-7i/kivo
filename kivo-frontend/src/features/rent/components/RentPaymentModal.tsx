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
import { FinancialWriteStatus, useFinancialWrite } from "@/features/finance/useFinancialWrite";
import { QueryState } from "@/features/finance/QueryState";
import { useAccounts } from "@/features/finance/queries";
import { useContacts } from "@/features/relationships/queries";
import { contactEntity } from "@/features/relationships/api";
import { useTodayInKolkata } from "@/features/relationships/useToday";
import { normalizeOpeningBalance } from "@/features/onboarding/money";
import type { PaymentDTO, PaymentInput } from "../api";
import { rentPaymentSchema, type RentPaymentFormData } from "../schemas/rent-payment.schema";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { paiseToDecimalString } from "@/lib/formatters/currency";
import { CreditCard, Info } from "lucide-react";
import type { RentObligationEntity } from "../types";
import type { ContactEntity } from "@/features/people/types";

interface AccountOption {
  id: string;
  name: string;
}

interface RentPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  obligation?: RentObligationEntity | null;
  roommates?: ContactEntity[];
  accounts?: AccountOption[];
  initialPayment?: PaymentDTO;
  onSuccess?: (data: RentPaymentFormData) => void;
}

export function RentPaymentModal({
  open,
  onOpenChange,
  obligation,
  initialPayment,
  onSuccess,
}: RentPaymentModalProps) {
  const accountQuery = useAccounts(open),
    contactQuery = useContacts(open);
  const accounts = (accountQuery.data ?? []).filter(
    (a) => !a.archived || a.id === initialPayment?.event.account
  );
  const roommates = (contactQuery.data ?? [])
    .filter((c) => !c.archived || c.id === initialPayment?.event.contact)
    .map(contactEntity);
  const [payerType, setPayerType] = React.useState<"owner" | "friend">(
    initialPayment?.event.kind === "shared_due" ? "friend" : "owner"
  );
  const today = useTodayInKolkata();
  const write = useFinancialWrite(
    initialPayment
      ? "rent-payment:" + initialPayment.id + ":correct"
      : "rent-payment:" + obligation?.id + ":create",
    true
  );

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RentPaymentFormData>({
    resolver: zodResolver(rentPaymentSchema),
    values: {
      obligationId: initialPayment?.obligation ?? obligation?.id ?? "",
      payerType,
      accountId: initialPayment?.event.account ?? accounts[0]?.id ?? "",
      payerContactId: initialPayment?.event.contact ?? "",
      amount:
        initialPayment?.event.amount ??
        (obligation ? paiseToDecimalString(obligation.outstandingPaise) : ""),
      effectiveDate: initialPayment?.event.effective_date ?? today,
      title:
        initialPayment?.event.title ??
        (obligation
          ? `Rent Payment for ${obligation.month.substring(0, 7)}`
          : "Monthly Rent Payment"),
      notes: initialPayment?.event.notes ?? "",
      paymentMethod: initialPayment?.event.payment_method || "UPI",
      reason: "",
    },
    resetOptions: {
      keepDirtyValues: true,
    },
  });

  const handleOpenChange = onOpenChange;

  const handlePayerTypeChange = (type: "owner" | "friend") => {
    if (initialPayment || write.busy || write.pending) return;
    setPayerType(type);
    setValue("payerType", type);
  };

  const onSubmit = async (data: RentPaymentFormData) => {
    if (initialPayment && data.reason.trim().length < 5) {
      setError("reason", { message: "An audit reason of at least 5 characters is required" });
      return;
    }
    const body: PaymentInput = {
      ...(data.payerType === "owner"
        ? { account: data.accountId }
        : { payer: data.payerContactId }),
      amount: normalizeOpeningBalance(data.amount),
      effective_date: data.effectiveDate,
      title: data.title,
      notes: data.notes,
      payment_method: data.paymentMethod,
    };
    const result = await write.run<PaymentDTO>(
      initialPayment
        ? "/api/v1/rent/payments/" + initialPayment.id + "/correct/"
        : "/api/v1/rent/obligations/" + data.obligationId + "/payments/",
      initialPayment ? { ...body, reason: data.reason } : body
    );
    if (result) {
      onSuccess?.(data);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
            <CreditCard className="size-5 text-kivo-primary" />
            <span>{initialPayment ? "Correct Rent Payment" : "Record Rent Payment"}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Confirm payment made to the landlord. Kivo accurately records whether funds left your
            account or a roommate paid on your behalf.
          </DialogDescription>
        </DialogHeader>

        {/* Obligation Details */}
        {obligation && (
          <div className="rounded-lg border border-border/80 bg-muted/30 p-3 space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">
                Cycle: {obligation.month.substring(0, 7)} (Due {obligation.dueDate})
              </span>
              <span className="font-mono text-muted-foreground">
                Outstanding:{" "}
                <MoneyAmount paise={obligation.outstandingPaise} size="xs" variant="reserved" />
              </span>
            </div>
          </div>
        )}

        {/* Who Paid? Toggle */}
        <div className="space-y-1.5 pt-1">
          <Label className="text-xs font-medium">Who Paid the Landlord?</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!!initialPayment || write.busy || write.pending}
              onClick={() => handlePayerTypeChange("owner")}
              className={`py-2 px-3 rounded-lg border text-xs font-medium text-center transition-all ${
                payerType === "owner"
                  ? "border-kivo-primary bg-kivo-primary/10 text-kivo-brand-dark dark:text-kivo-sage font-semibold"
                  : "border-border/80 hover:bg-muted/40 text-foreground"
              }`}
            >
              I Paid (Owner)
            </button>

            <button
              type="button"
              disabled={!!initialPayment || write.busy || write.pending}
              onClick={() => handlePayerTypeChange("friend")}
              className={`py-2 px-3 rounded-lg border text-xs font-medium text-center transition-all ${
                payerType === "friend"
                  ? "border-kivo-primary bg-kivo-primary/10 text-kivo-brand-dark dark:text-kivo-sage font-semibold"
                  : "border-border/80 hover:bg-muted/40 text-foreground"
              }`}
            >
              Roommate / Friend Paid
            </button>
          </div>
        </div>

        {/* Financial Invariant Notice */}
        <div className="rounded-lg border border-border/80 bg-muted/20 p-3 text-xs flex items-start gap-2">
          <Info className="size-4 shrink-0 text-kivo-secondary mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-normal">
            {payerType === "owner" ? (
              <span>
                <strong className="text-foreground">Owner Payment:</strong> Draws funds from your
                chosen bank/cash account. In a shared rent plan, roommates&apos; shares become
                receivable assets.
              </span>
            ) : (
              <span>
                <strong className="text-foreground">Friend Payment:</strong> Recognizes your
                personal rent expense and records a payable debt to your roommate without deducting
                cash from your bank today. Applicable reserves stay protected until repayment.
              </span>
            )}
          </p>
        </div>

        <FinancialWriteStatus write={write} onConfirmed={() => onOpenChange(false)} />
        <QueryState query={accountQuery} />
        <QueryState query={contactQuery} />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 py-1">
          <fieldset disabled={write.pending || write.busy} className="space-y-3.5 min-w-0">
            {initialPayment && (
              <div className="space-y-1.5">
                <Label htmlFor="rent-payment-reason">Audit Reason</Label>
                <Input id="rent-payment-reason" {...register("reason")} />
                {errors.reason && <FieldError message={errors.reason.message} />}
              </div>
            )}
            {/* Payer Account or Payer Contact */}
            {payerType === "owner" ? (
              <div className="space-y-1.5">
                <Label htmlFor="payment-account" className="text-xs font-medium">
                  Paying Account <span className="text-destructive">*</span>
                </Label>
                <select
                  id="payment-account"
                  {...register("accountId")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-hidden"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
                {errors.accountId && <FieldError message={errors.accountId.message} />}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="payment-friend" className="text-xs font-medium">
                  Select Roommate who Paid <span className="text-destructive">*</span>
                </Label>
                <select
                  id="payment-friend"
                  {...register("payerContactId")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-hidden"
                >
                  <option value="">-- Choose roommate/friend --</option>
                  {roommates.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.displayName} {r.isRoommate ? "(Roommate)" : ""}
                    </option>
                  ))}
                </select>
                {errors.payerContactId && <FieldError message={errors.payerContactId.message} />}
              </div>
            )}

            {/* Amount & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="payment-amount" className="text-xs font-medium">
                  Amount Paid (₹) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="payment-amount"
                  type="text"
                  placeholder="e.g. 30000"
                  {...register("amount")}
                  className="text-sm font-mono"
                />
                {errors.amount && <FieldError message={errors.amount.message} />}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="payment-date" className="text-xs font-medium">
                  Payment Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="payment-date"
                  type="date"
                  {...register("effectiveDate")}
                  className="text-sm"
                />
                {errors.effectiveDate && <FieldError message={errors.effectiveDate.message} />}
              </div>
            </div>

            {/* Method & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="payment-method" className="text-xs font-medium">
                  Payment Method
                </Label>
                <select
                  id="payment-method"
                  {...register("paymentMethod")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-hidden"
                >
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="NetBanking">Net Banking (IMPS / NEFT)</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="payment-notes" className="text-xs font-medium">
                  Notes / Reference
                </Label>
                <Input
                  id="payment-notes"
                  placeholder="e.g. Landlord receipt #104"
                  {...register("notes")}
                  className="text-sm"
                />
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
                {initialPayment ? "Save Rent Payment Correction" : "Record Payment"}
              </Button>
            </div>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
