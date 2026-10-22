"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { accountSchema, type AccountFormData } from "../schemas/account.schema";
import { zodResolver } from "@/lib/utils/zodResolver";
import { FormField } from "@/features/auth/components/FormField";
import { FieldError } from "@/features/auth/components/FieldError";
import { StepNavigation } from "./StepNavigation";
import { Label } from "@/components/ui/label";
import { ACCOUNT_TYPE_OPTIONS, type AccountType, type OnboardingAccountData } from "../types";
import { cn } from "@/lib/utils";
import { Building2, Banknote, Wallet, Info } from "lucide-react";
import { todayInKolkata } from "../money";

interface FirstAccountStepProps {
  initialData: Partial<OnboardingAccountData>;
  onBack: () => void;
  onNext: (data: OnboardingAccountData) => void;
}

const TYPE_ICONS: Record<AccountType, React.ReactNode> = {
  bank: <Building2 className="size-4 shrink-0" />,
  cash: <Banknote className="size-4 shrink-0" />,
  wallet: <Wallet className="size-4 shrink-0" />,
};

export function FirstAccountStep({ initialData, onBack, onNext }: FirstAccountStepProps) {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      accountName: initialData.accountName || "",
      accountType: initialData.accountType || "bank",
      openingBalance: initialData.openingBalance || "0",
      openingDate: initialData.openingDate || "",
    },
    mode: "onBlur",
  });

  const selectedType = useWatch({
    control,
    name: "accountType",
    defaultValue: initialData.accountType || "bank",
  });

  const onSubmit = (data: AccountFormData) => {
    const openingDate = data.openingDate || todayInKolkata();
    onNext({ ...data, openingDate });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 text-left" noValidate>
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Your First Money Account
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Create the primary account or cash repository where your money is held.
        </p>
      </div>

      {/* Critical Invariant Banner */}
      <div className="flex items-start gap-3 rounded-lg border border-kivo-sage/60 bg-kivo-sage/10 p-3.5 text-xs">
        <Info className="size-4 shrink-0 text-kivo-primary mt-0.5" />
        <div>
          <p className="font-semibold text-kivo-brand-dark dark:text-kivo-sage">
            Opening Balance is Not Income
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
            Starting funds establish your initial asset baseline. They are neither salary nor
            revenue, and will not distort your actual income analytics.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Account Name */}
        <FormField
          id="account-name"
          label="Account Name"
          placeholder="e.g. Primary Checking or Daily Wallet"
          required
          error={errors.accountName?.message}
          {...register("accountName")}
        />

        {/* Account Type Selection */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground">
            Account Type <span className="text-destructive">*</span>
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {ACCOUNT_TYPE_OPTIONS.map((opt) => {
              const isSelected = selectedType === opt.type;
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setValue("accountType", opt.type, { shouldValidate: true })}
                  className={cn(
                    "flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-all cursor-pointer",
                    isSelected
                      ? "border-kivo-primary bg-kivo-primary/5 ring-2 ring-kivo-primary/20 shadow-xs"
                      : "border-border bg-card hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "flex size-6 items-center justify-center rounded-md",
                        isSelected ? "bg-kivo-primary text-white" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {TYPE_ICONS[opt.type]}
                    </div>
                    <span className="text-xs font-bold text-foreground">{opt.label}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    {opt.description}
                  </p>
                </button>
              );
            })}
          </div>
          <FieldError error={errors.accountType?.message} />
        </div>

        {/* Opening Balance and Opening Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            id="opening-balance"
            label="Opening Balance (₹)"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            required
            helperText="Stored precisely in integer paise (100 paise = ₹1)."
            error={errors.openingBalance?.message}
            {...register("openingBalance")}
          />

          <FormField
            id="opening-date"
            label="Opening Date"
            type="date"
            required
            helperText="The date this starting balance is recorded."
            error={errors.openingDate?.message}
            {...register("openingDate")}
          />
        </div>
      </div>

      <StepNavigation type="submit" onBack={onBack} nextLabel="Review Setup" />
    </form>
  );
}
