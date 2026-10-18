"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FormField } from "@/features/auth/components/FormField";
import { FieldError } from "@/features/auth/components/FieldError";
import { Label } from "@/components/ui/label";
import { IntegrationPendingBadge } from "@/components/shared/IntegrationPendingBadge";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@/lib/utils/zodResolver";
import {
  accountManageSchema,
  type AccountManageFormData,
} from "../schemas/account-manage.schema";
import type { AccountEntity, AccountKind } from "../types";
import { Building2, Banknote, Wallet, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccountFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialAccount?: AccountEntity | null;
}

const KIND_OPTIONS: { kind: AccountKind; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    kind: "bank",
    label: "Bank Account",
    icon: <Building2 className="size-4" />,
    desc: "Savings, checking, salary accounts",
  },
  {
    kind: "cash",
    label: "Physical Cash",
    icon: <Banknote className="size-4" />,
    desc: "Cash in wallet, physical safe, home cash",
  },
  {
    kind: "wallet",
    label: "Digital Wallet",
    icon: <Wallet className="size-4" />,
    desc: "Prepaid wallet balances (Paytm, Amazon Pay, etc.)",
  },
];

export function AccountFormModal({
  open,
  onOpenChange,
  initialAccount,
}: AccountFormModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [pendingNotice, setPendingNotice] = React.useState<string | null>(null);

  const values = React.useMemo(() => {
    if (initialAccount) {
      return {
        name: initialAccount.name,
        kind: initialAccount.kind,
        openingBalance: (initialAccount.openingBalancePaise / 100).toFixed(2),
        openedOn: initialAccount.openedOn || "2026-10-18",
      };
    }
    return {
      name: "",
      kind: "bank" as const,
      openingBalance: "0.00",
      openedOn: "2026-10-18",
    };
  }, [initialAccount]);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<AccountManageFormData>({
    resolver: zodResolver(accountManageSchema),
    values,
    mode: "onBlur",
  });

  // Ensure current date is set on client when modal opens
  React.useEffect(() => {
    if (open && !initialAccount) {
      const today = new Date().toISOString().split("T")[0];
      setValue("openedOn", today);
    }
  }, [open, initialAccount, setValue]);

  const selectedKind = useWatch({ control, name: "kind", defaultValue: "bank" });

  const onSubmit = async () => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 400));
    setIsSubmitting(false);
    setPendingNotice(
      initialAccount
        ? "Backend integration pending: Account updates will connect to Django in subsequent phases."
        : "Backend integration pending: Account creation with opening ledger entry will connect to Django in subsequent phases."
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-6 sm:max-w-[540px]">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl font-bold font-heading">
            {initialAccount ? "Edit Money Account" : "Add Money Account"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Configure your physical cash, bank repository, or stored-value wallet.
          </DialogDescription>
        </DialogHeader>

        {pendingNotice && (
          <IntegrationPendingBadge
            variant="banner"
            message={pendingNotice}
            className="mb-2"
          />
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left" noValidate>
          {/* Financial Invariant Notice */}
          <div className="flex items-start gap-2.5 rounded-lg border border-kivo-sage/60 bg-kivo-sage/10 p-3 text-xs text-foreground">
            <Info className="size-4 shrink-0 text-kivo-primary mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-kivo-brand-dark dark:text-kivo-sage">
                Opening Balance is Not Income
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Initial funds anchor your starting balance in the ledger. They do not count toward your earned salary or personal revenue.
              </p>
            </div>
          </div>

          <FormField
            id="account-name"
            label="Account Name"
            placeholder="e.g. HDFC Salary Account or Daily Cash Wallet"
            required
            error={errors.name?.message}
            {...register("name")}
          />

          {/* Account Type Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">
              Account Type <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {KIND_OPTIONS.map((opt) => {
                const isSelected = selectedKind === opt.kind;
                return (
                  <button
                    key={opt.kind}
                    type="button"
                    onClick={() => setValue("kind", opt.kind, { shouldValidate: true })}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-all cursor-pointer",
                      isSelected
                        ? "border-kivo-primary bg-kivo-primary/5 ring-2 ring-kivo-primary/20 shadow-xs"
                        : "border-border bg-card hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <div
                        className={cn(
                          "flex size-5 items-center justify-center rounded-md",
                          isSelected ? "text-kivo-primary" : "text-muted-foreground"
                        )}
                      >
                        {opt.icon}
                      </div>
                      <span className="text-xs font-bold text-foreground">
                        {opt.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      {opt.desc}
                    </p>
                  </button>
                );
              })}
            </div>
            <FieldError error={errors.kind?.message} />
          </div>

          {/* UPI clarification note */}
          <p className="text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/60">
            <strong>Note on UPI:</strong> A UPI-linked bank account is still a bank account; UPI is a payment method, not a separate account.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              id="account-opening-balance"
              label="Opening Balance (₹)"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              required
              helperText="Exact integer paise arithmetic."
              error={errors.openingBalance?.message}
              {...register("openingBalance")}
            />

            <FormField
              id="account-opened-on"
              label="Opening Date"
              type="date"
              required
              helperText="Date balance is established."
              error={errors.openedOn?.message}
              {...register("openedOn")}
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-1.5" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{initialAccount ? "Save Changes" : "Create Account"}</span>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
