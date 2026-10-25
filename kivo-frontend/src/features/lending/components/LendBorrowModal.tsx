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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/features/auth/components/FieldError";
import { useFinancialWrite, FinancialWriteStatus } from "@/features/finance/useFinancialWrite";
import { QueryState } from "@/features/finance/QueryState";
import { normalizeOpeningBalance } from "@/features/onboarding/money";
import { useTodayInKolkata } from "@/features/relationships/useToday";
import { useAccounts } from "@/features/finance/queries";
import { useContacts } from "@/features/relationships/queries";
import { contactEntity, type LoanInput } from "@/features/relationships/api";
import type { EventDTO } from "@/features/finance/api";
import { loanSchema, type LoanFormData } from "../schemas/loan.schema";
import { HandCoins, ArrowDownLeft, Info } from "lucide-react";
import type { ContactEntity } from "@/features/people/types";

interface AccountOption {
  id: string;
  name: string;
}

interface LendBorrowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultKind?: "lend" | "borrow";
  initialEvent?: EventDTO;
  defaultContactId?: string;
  contacts?: ContactEntity[];
  accounts?: AccountOption[];
  onSuccess?: (data: LoanFormData) => void;
}

export function LendBorrowModal({
  open,
  onOpenChange,
  defaultKind = "lend",
  defaultContactId = "",
  initialEvent,
  onSuccess,
}: LendBorrowModalProps) {
  const [kind, setKind] = React.useState<"lend" | "borrow">(
    initialEvent?.kind === "borrow" ? "borrow" : defaultKind
  );
  const contactQuery = useContacts(open),
    accountQuery = useAccounts(open);
  const contacts = (contactQuery.data ?? [])
      .filter((c) => !c.archived || c.id === initialEvent?.contact)
      .map(contactEntity),
    accounts = (accountQuery.data ?? []).filter((a) => !a.archived);
  const today = useTodayInKolkata();
  const write = useFinancialWrite(
    initialEvent ? `loan:${initialEvent.id}:correct` : "loan:create",
    true
  );

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoanFormData>({
    resolver: zodResolver(loanSchema),
    values: {
      kind,
      contactId: initialEvent?.contact ?? defaultContactId,
      accountId: initialEvent?.account ?? accounts[0]?.id ?? "",
      amount: initialEvent?.amount ?? "",
      effectiveDate: initialEvent?.effective_date ?? today,
      title: initialEvent?.title ?? "",
      notes: initialEvent?.notes ?? "",
      paymentMethod: initialEvent?.payment_method ?? "UPI",
      reason: "",
    },
    resetOptions: {
      keepDirtyValues: true,
    },
  });

  const handleOpenChange = onOpenChange;

  const handleKindChange = (newKind: "lend" | "borrow") => {
    setKind(newKind);
    setValue("kind", newKind);
  };

  const onSubmit = async (data: LoanFormData) => {
    if (initialEvent && data.reason.trim().length < 5) {
      setError("reason", { message: "An audit reason of at least 5 characters is required" });
      return;
    }
    const body: LoanInput = {
      kind: data.kind,
      contact: data.contactId,
      account: data.accountId,
      amount: normalizeOpeningBalance(data.amount),
      effective_date: data.effectiveDate,
      title: data.title,
      notes: data.notes,
      payment_method: data.paymentMethod,
    };
    const result = await write.run<EventDTO>(
      initialEvent ? `/api/v1/loans/${initialEvent.id}/correct/` : "/api/v1/loans/",
      initialEvent ? { ...body, reason: data.reason } : body
    );
    if (result) {
      onSuccess?.(data);
      onOpenChange(false);
    }
  };

  const isLend = kind === "lend";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-heading font-semibold text-foreground">
            {isLend ? "Lend Money to Friend" : "Borrow Money from Friend"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Track personal advances and borrowing. Lending creates a recoverable asset; borrowing
            creates a liability.
          </DialogDescription>
        </DialogHeader>

        {/* Kind Toggle Tabs */}
        <div className="pt-1">
          <Tabs
            value={kind}
            onValueChange={(val) => handleKindChange(val as "lend" | "borrow")}
            className="w-full"
          >
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger
                disabled={write.pending || write.busy || !!initialEvent}
                value="lend"
                className="gap-1.5 text-xs"
              >
                <HandCoins className="size-3.5" />
                <span>Lend Money</span>
              </TabsTrigger>
              <TabsTrigger
                disabled={write.pending || write.busy || !!initialEvent}
                value="borrow"
                className="gap-1.5 text-xs"
              >
                <ArrowDownLeft className="size-3.5" />
                <span>Borrow Money</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Financial Invariant Notice */}
        <div
          className={`rounded-lg border p-3 text-xs flex items-start gap-2 ${
            isLend
              ? "border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300"
              : "border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300"
          }`}
        >
          <Info className="size-4 shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-tight">
            <span className="font-semibold block">
              {isLend ? "Lending is NOT personal spending" : "Borrowing is NOT personal income"}
            </span>
            <span className="text-[11px] opacity-90">
              {isLend
                ? "Funds moving to a friend remain your asset as a receivable claim. It does not reduce your personal budget."
                : "Borrowed funds increase your cash and create an offsetting payable liability. It is never counted as income."}
            </span>
          </div>
        </div>

        <FinancialWriteStatus write={write} onConfirmed={() => onOpenChange(false)} />

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
            {/* Contact Selection */}
            <div className="space-y-1.5">
              <Label htmlFor="loan-contact" className="text-xs font-medium">
                {isLend ? "Select Friend (Borrower)" : "Select Lender"}{" "}
                <span className="text-destructive">*</span>
              </Label>
              <select
                id="loan-contact"
                {...register("contactId")}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
              >
                <option value="">-- Choose a contact --</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName} {c.isRoommate ? "(Roommate)" : ""}
                  </option>
                ))}
              </select>
              {errors.contactId && <FieldError message={errors.contactId.message} />}
            </div>

            {/* Amount & Account */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="loan-amount" className="text-xs font-medium">
                  Amount (₹) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="loan-amount"
                  type="text"
                  placeholder="e.g. 2000"
                  {...register("amount")}
                  className="text-sm font-mono"
                />
                {errors.amount && <FieldError message={errors.amount.message} />}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="loan-account" className="text-xs font-medium">
                  {isLend ? "Paying Account" : "Receiving Account"}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <select
                  id="loan-account"
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

            {/* Title / Purpose */}
            <div className="space-y-1.5">
              <Label htmlFor="loan-title" className="text-xs font-medium">
                Purpose / Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="loan-title"
                placeholder={
                  isLend ? "e.g. Advance for grocery split" : "e.g. Emergency cab fare assistance"
                }
                {...register("title")}
                className="text-sm"
              />
              {errors.title && <FieldError message={errors.title.message} />}
            </div>

            {/* Date & Payment Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="loan-date" className="text-xs font-medium">
                  Effective Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="loan-date"
                  type="date"
                  {...register("effectiveDate")}
                  className="text-sm"
                />
                {errors.effectiveDate && <FieldError message={errors.effectiveDate.message} />}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="loan-method" className="text-xs font-medium">
                  Payment Method
                </Label>
                <select
                  id="loan-method"
                  {...register("paymentMethod")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
                >
                  <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
                  <option value="Cash">Physical Cash</option>
                  <option value="Bank Transfer">IMPS / NEFT Transfer</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="loan-notes" className="text-xs font-medium">
                Optional Notes
              </Label>
              <Input
                id="loan-notes"
                placeholder="e.g. Agreed to repay by next Friday"
                {...register("notes")}
                className="text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/50">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className={`text-white font-medium ${
                  isLend ? "bg-emerald-700 hover:bg-emerald-800" : "bg-amber-700 hover:bg-amber-800"
                }`}
              >
                {isLend ? "Record Lent Money" : "Record Borrowed Money"}
              </Button>
            </div>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
