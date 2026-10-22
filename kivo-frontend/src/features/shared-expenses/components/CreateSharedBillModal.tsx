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
import { sharedBillSchema, type SharedBillFormData } from "../schemas/shared-bill.schema";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { parseDecimalStringToPaise } from "@/lib/formatters/currency";
import { Users, Info, CheckCircle2, AlertCircle } from "lucide-react";
import type { ContactEntity } from "@/features/people/types";

interface AccountOption {
  id: string;
  name: string;
}

interface CreateSharedBillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts?: ContactEntity[];
  accounts?: AccountOption[];
  onSuccess?: (data: SharedBillFormData) => void;
}

const DEFAULT_ACCOUNTS: AccountOption[] = [
  { id: "acc-bank-1", name: "HDFC Primary Bank Account" },
  { id: "acc-cash-1", name: "Physical Cash Wallet" },
  { id: "acc-wallet-1", name: "Digital Wallet" },
];

const DEFAULT_CATEGORIES = [
  "Food & Groceries",
  "Living Expenses",
  "Utilities & Bills",
  "Transit & Fuel",
  "Shopping & Personal",
  "Entertainment",
  "Other",
];

export function CreateSharedBillModal({
  open,
  onOpenChange,
  contacts = [],
  accounts = DEFAULT_ACCOUNTS,
  onSuccess,
}: CreateSharedBillModalProps) {
  const [payerType, setPayerType] = React.useState<"user" | "friend">("user");
  const [splitMethod, setSplitMethod] = React.useState<"equal" | "custom">("equal");
  const [selectedContacts, setSelectedContacts] = React.useState<string[]>(() => {
    return contacts
      .filter((c) => !c.archived)
      .slice(0, 2)
      .map((c) => c.id);
  });
  const [customAmounts, setCustomAmounts] = React.useState<Record<string, string>>({});
  const [pendingNotice, setPendingNotice] = React.useState<string | null>(null);

  const initialParticipants = React.useMemo(() => {
    return contacts
      .filter((c) => !c.archived)
      .slice(0, 2)
      .map((c) => c.id);
  }, [contacts]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SharedBillFormData>({
    resolver: zodResolver(sharedBillSchema),
    defaultValues: {
      title: "",
      amount: "",
      category: DEFAULT_CATEGORIES[0] || "Food & Groceries",
      effectiveDate: "2026-10-20",
      payerType: "user",
      payerContactId: "",
      accountId: accounts[0]?.id || "",
      splitMethod: "equal",
      merchant: "",
      notes: "",
      selectedParticipants: initialParticipants,
      customShares: {},
    },
  });

  const rawAmount = watch("amount");

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setPendingNotice(null);
    }
    onOpenChange(isOpen);
  };

  // Handle contact checkbox toggle
  const toggleContact = (contactId: string) => {
    const updated = selectedContacts.includes(contactId)
      ? selectedContacts.filter((id) => id !== contactId)
      : [...selectedContacts, contactId];

    setSelectedContacts(updated);
    setValue("selectedParticipants", updated);
  };

  // Safe parse integer paise for gross amount
  const grossPaise = React.useMemo(() => {
    try {
      return parseDecimalStringToPaise(rawAmount || "0");
    } catch {
      return 0;
    }
  }, [rawAmount]);

  // Compute live equal split
  const equalSplitShares = React.useMemo(() => {
    if (grossPaise <= 0 || selectedContacts.length === 0) return [];

    const totalParticipants = selectedContacts.length + 1; // User + selected friends
    const baseShare = Math.floor(grossPaise / totalParticipants);
    const remainder = grossPaise % totalParticipants;

    // Owner (user) gets remainder paise first per ADR-005 rule!
    const userSharePaise = baseShare + (remainder > 0 ? 1 : 0);

    const shares = [
      {
        id: "user",
        name: "You (Personal Expense)",
        amountPaise: userSharePaise,
        isUser: true,
      },
    ];

    let remainingRemainder = Math.max(0, remainder - 1);
    selectedContacts.forEach((contactId) => {
      const contact = contacts.find((c) => c.id === contactId);
      const extraPaisa = remainingRemainder > 0 ? 1 : 0;
      if (remainingRemainder > 0) remainingRemainder--;

      shares.push({
        id: contactId,
        name: contact?.displayName || "Friend",
        amountPaise: baseShare + extraPaisa,
        isUser: false,
      });
    });

    return shares;
  }, [grossPaise, selectedContacts, contacts]);

  // Custom split sum
  const customTotalPaise = React.useMemo(() => {
    let sum = 0;
    Object.values(customAmounts).forEach((val) => {
      try {
        sum += parseDecimalStringToPaise(val || "0");
      } catch {
        // ignore invalid
      }
    });
    return sum;
  }, [customAmounts]);

  const customDifferencePaise = grossPaise - customTotalPaise;

  const onSubmit = async (data: SharedBillFormData) => {
    setPendingNotice(
      `Shared bill "${data.title}" (Total: ₹${data.amount}) validated. In Phase 7 integration, this will post to Django /api/v1/shared-bills/.`
    );

    if (onSuccess) {
      onSuccess(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
            <Users className="size-5 text-kivo-primary" />
            <span>Create Shared Bill</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Split an expense with friends or flatmates. Kivo cleanly separates your personal expense
            share from friends&apos; receivable claims.
          </DialogDescription>
        </DialogHeader>

        {/* Financial Invariant Callout */}
        <div className="rounded-lg border border-border/80 bg-muted/30 p-3 text-xs flex items-start gap-2">
          <Info className="size-4 shrink-0 text-kivo-secondary mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-foreground block">
              Gross Bill ≠ Personal Expense
            </span>
            <span className="text-[11px] text-muted-foreground block">
              When you pay ₹6,000 split equally with 1 friend, your personal expense is ₹3,000. The
              remaining ₹3,000 is a receivable asset, not personal spending.
            </span>
          </div>
        </div>

        {pendingNotice && (
          <div className="rounded-lg border border-kivo-sage/50 bg-kivo-sage/15 p-3 text-xs text-kivo-brand-dark dark:text-kivo-sage space-y-1">
            <div className="flex items-center gap-1.5 font-medium">
              <IntegrationPendingBadge />
              <span>Shared Bill Validated in Frontend</span>
            </div>
            <p className="text-[11px] opacity-90">{pendingNotice}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-1">
          {/* Title & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bill-title" className="text-xs font-medium">
                Bill Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="bill-title"
                placeholder="e.g. Nature's Basket Groceries"
                {...register("title")}
                className="text-sm"
              />
              {errors.title && <FieldError message={errors.title.message} />}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bill-category" className="text-xs font-medium">
                Category <span className="text-destructive">*</span>
              </Label>
              <select
                id="bill-category"
                {...register("category")}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
              >
                {DEFAULT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bill-amount" className="text-xs font-medium">
                Total Bill Amount (₹) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="bill-amount"
                type="text"
                placeholder="e.g. 6000"
                {...register("amount")}
                className="text-sm font-mono"
              />
              {errors.amount && <FieldError message={errors.amount.message} />}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bill-date" className="text-xs font-medium">
                Effective Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="bill-date"
                type="date"
                {...register("effectiveDate")}
                className="text-sm"
              />
              {errors.effectiveDate && <FieldError message={errors.effectiveDate.message} />}
            </div>
          </div>

          {/* Who Paid? */}
          <div className="space-y-2 pt-1 border-t border-border/50">
            <Label className="text-xs font-medium">
              Who Paid for this Bill? <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setPayerType("user");
                  setValue("payerType", "user");
                }}
                className={`py-2 px-3 rounded-lg border text-xs font-medium text-center transition-all ${
                  payerType === "user"
                    ? "border-kivo-primary bg-kivo-primary/10 text-kivo-brand-dark dark:text-kivo-sage font-semibold"
                    : "border-border/80 hover:bg-muted/40 text-foreground"
                }`}
              >
                I Paid (User)
              </button>

              <button
                type="button"
                onClick={() => {
                  setPayerType("friend");
                  setValue("payerType", "friend");
                }}
                className={`py-2 px-3 rounded-lg border text-xs font-medium text-center transition-all ${
                  payerType === "friend"
                    ? "border-kivo-primary bg-kivo-primary/10 text-kivo-brand-dark dark:text-kivo-sage font-semibold"
                    : "border-border/80 hover:bg-muted/40 text-foreground"
                }`}
              >
                A Friend Paid
              </button>
            </div>

            {/* Payer Account or Payer Contact */}
            {payerType === "user" ? (
              <div className="space-y-1 pt-1">
                <Label htmlFor="payer-account" className="text-[11px] text-muted-foreground">
                  Paid from Account
                </Label>
                <select
                  id="payer-account"
                  {...register("accountId")}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-hidden"
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
              <div className="space-y-1 pt-1">
                <Label htmlFor="payer-friend" className="text-[11px] text-muted-foreground">
                  Select Payer Contact
                </Label>
                <select
                  id="payer-friend"
                  {...register("payerContactId")}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-hidden"
                >
                  <option value="">-- Choose friend who paid --</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.displayName} {c.isRoommate ? "(Roommate)" : ""}
                    </option>
                  ))}
                </select>
                {errors.payerContactId && <FieldError message={errors.payerContactId.message} />}
              </div>
            )}
          </div>

          {/* Participant Selection */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">
                Participants in this Bill <span className="text-destructive">*</span>
              </Label>
              <span className="text-[11px] text-muted-foreground">
                You + {selectedContacts.length} friend{selectedContacts.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="rounded-lg border border-border/70 p-3 bg-muted/20 space-y-2">
              {/* You are always included */}
              <div className="flex items-center justify-between text-xs py-1 px-2 rounded-md bg-card border border-border/60">
                <span className="font-semibold text-foreground">You (Account Owner)</span>
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  Always Included
                </span>
              </div>

              {/* Friends checkboxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-36 overflow-y-auto">
                {contacts
                  .filter((c) => !c.archived)
                  .map((c) => {
                    const isChecked = selectedContacts.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer select-none transition-colors ${
                          isChecked
                            ? "border-kivo-sage bg-card font-medium text-foreground"
                            : "border-transparent hover:bg-card/60 text-muted-foreground"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleContact(c.id)}
                          className="size-3.5 rounded border-border text-kivo-primary focus:ring-kivo-secondary"
                        />
                        <span className="truncate">{c.displayName}</span>
                      </label>
                    );
                  })}
              </div>
            </div>
            {errors.selectedParticipants && (
              <FieldError message={errors.selectedParticipants.message} />
            )}
          </div>

          {/* Split Mode Toggle */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Split Calculation Method</Label>
              <div className="flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setSplitMethod("equal");
                    setValue("splitMethod", "equal");
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    splitMethod === "equal"
                      ? "bg-kivo-primary text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  Equal Split
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSplitMethod("custom");
                    setValue("splitMethod", "custom");
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    splitMethod === "custom"
                      ? "bg-kivo-primary text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  Custom Split
                </button>
              </div>
            </div>

            {/* Split Preview */}
            {splitMethod === "equal" ? (
              <div className="rounded-lg border border-border/80 bg-card p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground border-b border-border/40 pb-1.5">
                  <span>Participant</span>
                  <span>Calculated Share</span>
                </div>
                {equalSplitShares.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 italic py-1">
                    Enter an amount and select at least one friend to see equal shares.
                  </p>
                ) : (
                  <div className="space-y-1.5 text-xs">
                    {equalSplitShares.map((s) => (
                      <div key={s.id} className="flex items-center justify-between">
                        <span
                          className={
                            s.isUser ? "font-semibold text-foreground" : "text-muted-foreground"
                          }
                        >
                          {s.name}
                        </span>
                        <MoneyAmount
                          paise={s.amountPaise}
                          size="xs"
                          variant={s.isUser ? "expense" : "income"}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-border/80 bg-card p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">Custom Share Allocation</span>
                  <div className="flex items-center gap-1 font-mono text-xs">
                    {customDifferencePaise === 0 ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                        <CheckCircle2 className="size-3" /> Exact Match
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                        <AlertCircle className="size-3" /> Diff: ₹
                        {(customDifferencePaise / 100).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Inputs for each participant */}
                <div className="space-y-2 pt-1 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground">You (Owner)</span>
                    <Input
                      type="text"
                      placeholder="0.00"
                      value={customAmounts["user"] || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        const next = { ...customAmounts, user: val };
                        setCustomAmounts(next);
                        setValue("customShares", next);
                      }}
                      className="w-28 text-right font-mono text-xs h-7"
                    />
                  </div>

                  {selectedContacts.map((cId) => {
                    const c = contacts.find((item) => item.id === cId);
                    return (
                      <div key={cId} className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground truncate">
                          {c?.displayName || "Friend"}
                        </span>
                        <Input
                          type="text"
                          placeholder="0.00"
                          value={customAmounts[cId] || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            const next = { ...customAmounts, [cId]: val };
                            setCustomAmounts(next);
                            setValue("customShares", next);
                          }}
                          className="w-28 text-right font-mono text-xs h-7"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
              Save Shared Bill
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
