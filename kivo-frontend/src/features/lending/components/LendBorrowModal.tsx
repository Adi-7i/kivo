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
import { IntegrationPendingBadge } from "@/components/shared/IntegrationPendingBadge";
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
  defaultContactId?: string;
  contacts?: ContactEntity[];
  accounts?: AccountOption[];
  onSuccess?: (data: LoanFormData) => void;
}

const DEFAULT_ACCOUNTS: AccountOption[] = [
  { id: "acc-bank-1", name: "HDFC Primary Bank Account" },
  { id: "acc-cash-1", name: "Physical Cash Wallet" },
  { id: "acc-wallet-1", name: "Digital Wallet" },
];

export function LendBorrowModal({
  open,
  onOpenChange,
  defaultKind = "lend",
  defaultContactId = "",
  contacts = [],
  accounts = DEFAULT_ACCOUNTS,
  onSuccess,
}: LendBorrowModalProps) {
  const [kind, setKind] = React.useState<"lend" | "borrow">(defaultKind);
  const [pendingNotice, setPendingNotice] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoanFormData>({
    resolver: zodResolver(loanSchema),
    values: {
      kind,
      contactId: defaultContactId,
      accountId: accounts[0]?.id || "",
      amount: "",
      effectiveDate: "2026-10-20",
      title: "",
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

  const handleKindChange = (newKind: "lend" | "borrow") => {
    setKind(newKind);
    setValue("kind", newKind);
  };

  const onSubmit = async (data: LoanFormData) => {
    const contactObj = contacts.find((c) => c.id === data.contactId);
    const contactName = contactObj?.displayName || "Contact";
    const actionLabel = data.kind === "lend" ? "Lending to" : "Borrowing from";

    setPendingNotice(
      `${actionLabel} ${contactName} (₹${data.amount}) validated. In Phase 7 integration, this will post to Django /api/v1/loans/.`
    );

    if (onSuccess) {
      onSuccess(data);
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
              <TabsTrigger value="lend" className="gap-1.5 text-xs">
                <HandCoins className="size-3.5" />
                <span>Lend Money</span>
              </TabsTrigger>
              <TabsTrigger value="borrow" className="gap-1.5 text-xs">
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

        {pendingNotice && (
          <div className="rounded-lg border border-kivo-sage/50 bg-kivo-sage/15 p-3 text-xs text-kivo-brand-dark dark:text-kivo-sage space-y-1">
            <div className="flex items-center gap-1.5 font-medium">
              <IntegrationPendingBadge />
              <span>Operation Validated in Frontend</span>
            </div>
            <p className="text-[11px] opacity-90">{pendingNotice}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 py-1">
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
        </form>
      </DialogContent>
    </Dialog>
  );
}
