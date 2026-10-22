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
import { rentPlanSchema, type RentPlanFormData } from "../schemas/rent-plan.schema";
import { paiseToDecimalString } from "@/lib/formatters/currency";
import { Settings2 } from "lucide-react";
import type { RentPlanEntity } from "../types";
import type { ContactEntity } from "@/features/people/types";

interface RentPlanConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: RentPlanEntity | null;
  roommates?: ContactEntity[];
  onSuccess?: (data: RentPlanFormData) => void;
}

export function RentPlanConfigModal({
  open,
  onOpenChange,
  plan,
  roommates = [],
  onSuccess,
}: RentPlanConfigModalProps) {
  const [dueRule, setDueRule] = React.useState<"fixed_day" | "last_day">(
    plan?.dueDay ? "fixed_day" : "last_day"
  );
  const [isShared, setIsShared] = React.useState<boolean>(Boolean(plan && plan.shares.length > 1));
  const [selectedRoommates, setSelectedRoommates] = React.useState<string[]>(
    plan ? plan.shares.filter((s) => s.contactId !== null).map((s) => s.contactId as string) : []
  );
  const [pendingNotice, setPendingNotice] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RentPlanFormData>({
    resolver: zodResolver(rentPlanSchema),
    values: {
      title: plan?.title || "Monthly Apartment Rent",
      payee: plan?.payee || "",
      startDate: plan?.startDate || "2026-06-01",
      dueDayRule: dueRule,
      dueDay: plan?.dueDay ?? 5,
      amount: plan ? paiseToDecimalString(plan.amountPaise) : "30000",
      isShared,
      splitMethod: plan?.splitMethod || "equal",
      roommateContactIds: selectedRoommates,
      active: plan?.active ?? true,
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

  const toggleRoommate = (contactId: string) => {
    const next = selectedRoommates.includes(contactId)
      ? selectedRoommates.filter((id) => id !== contactId)
      : [...selectedRoommates, contactId];

    setSelectedRoommates(next);
    setValue("roommateContactIds", next);
  };

  const onSubmit = async (data: RentPlanFormData) => {
    setPendingNotice(
      `Rent plan "${data.title}" (₹${data.amount}/mo) validated. In Phase 7 integration, terms are immutable after creation and persist to Django /api/v1/rent/plans/.`
    );

    if (onSuccess) {
      onSuccess(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
            <Settings2 className="size-5 text-kivo-primary" />
            <span>Configure Monthly Rent Plan</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Set rent amount, payee, due-day rules, and optional roommate split terms.
          </DialogDescription>
        </DialogHeader>

        {pendingNotice && (
          <div className="rounded-lg border border-kivo-sage/50 bg-kivo-sage/15 p-3 text-xs text-kivo-brand-dark dark:text-kivo-sage space-y-1">
            <div className="flex items-center gap-1.5 font-medium">
              <IntegrationPendingBadge />
              <span>Rent Plan Validated in Frontend</span>
            </div>
            <p className="text-[11px] opacity-90">{pendingNotice}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-1">
          {/* Plan Title & Payee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="plan-title" className="text-xs font-medium">
                Plan Name / Label <span className="text-destructive">*</span>
              </Label>
              <Input
                id="plan-title"
                placeholder="e.g. Indiranagar 3BHK Flat Rent"
                {...register("title")}
                className="text-sm"
              />
              {errors.title && <FieldError message={errors.title.message} />}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="plan-payee" className="text-xs font-medium">
                Landlord / Payee Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="plan-payee"
                placeholder="e.g. Brigade Residency Landlord"
                {...register("payee")}
                className="text-sm"
              />
              {errors.payee && <FieldError message={errors.payee.message} />}
            </div>
          </div>

          {/* Gross Amount & Start Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="plan-amount" className="text-xs font-medium">
                Gross Monthly Rent (₹) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="plan-amount"
                type="text"
                placeholder="e.g. 30000"
                {...register("amount")}
                className="text-sm font-mono"
              />
              {errors.amount && <FieldError message={errors.amount.message} />}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="plan-start" className="text-xs font-medium">
                Plan Start Date <span className="text-destructive">*</span>
              </Label>
              <Input id="plan-start" type="date" {...register("startDate")} className="text-sm" />
              {errors.startDate && <FieldError message={errors.startDate.message} />}
            </div>
          </div>

          {/* Due Day Rule */}
          <div className="space-y-2 pt-1 border-t border-border/50">
            <Label className="text-xs font-medium">Monthly Due Day Rule</Label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setDueRule("fixed_day");
                  setValue("dueDayRule", "fixed_day");
                }}
                className={`py-2 px-3 rounded-lg border text-xs font-medium text-center transition-all ${
                  dueRule === "fixed_day"
                    ? "border-kivo-primary bg-kivo-primary/10 text-kivo-brand-dark dark:text-kivo-sage font-semibold"
                    : "border-border/80 hover:bg-muted/40 text-foreground"
                }`}
              >
                Fixed Day of Month
              </button>

              <button
                type="button"
                onClick={() => {
                  setDueRule("last_day");
                  setValue("dueDayRule", "last_day");
                  setValue("dueDay", null);
                }}
                className={`py-2 px-3 rounded-lg border text-xs font-medium text-center transition-all ${
                  dueRule === "last_day"
                    ? "border-kivo-primary bg-kivo-primary/10 text-kivo-brand-dark dark:text-kivo-sage font-semibold"
                    : "border-border/80 hover:bg-muted/40 text-foreground"
                }`}
              >
                Last Day of Month
              </button>
            </div>

            {dueRule === "fixed_day" && (
              <div className="space-y-1 pt-1">
                <Label htmlFor="plan-day" className="text-[11px] text-muted-foreground">
                  Day of Month (1–31, automatically clamped for February / shorter months)
                </Label>
                <Input
                  id="plan-day"
                  type="number"
                  min={1}
                  max={31}
                  defaultValue={5}
                  {...register("dueDay", { valueAsNumber: true })}
                  className="w-24 text-sm font-mono"
                />
              </div>
            )}
          </div>

          {/* Shared Rent Checkbox & Roommates */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground select-none">
              <input
                type="checkbox"
                checked={isShared}
                onChange={(e) => {
                  setIsShared(e.target.checked);
                  setValue("isShared", e.target.checked);
                }}
                className="size-4 rounded border-border text-kivo-primary focus:ring-kivo-secondary"
              />
              <span className="font-medium">This is a Shared Rent Plan with Flatmates</span>
            </label>

            {isShared && (
              <div className="rounded-lg border border-border/70 p-3 bg-muted/20 space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">Select Roommates</span>
                  <span className="text-[11px] text-muted-foreground">
                    You + {selectedRoommates.length} roommate
                    {selectedRoommates.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto pt-1">
                  {roommates
                    .filter((r) => !r.archived)
                    .map((r) => {
                      const isChecked = selectedRoommates.includes(r.id);
                      return (
                        <label
                          key={r.id}
                          className={`flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer select-none transition-colors ${
                            isChecked
                              ? "border-kivo-sage bg-card font-medium text-foreground"
                              : "border-transparent hover:bg-card/60 text-muted-foreground"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleRoommate(r.id)}
                            className="size-3.5 rounded border-border text-kivo-primary focus:ring-kivo-secondary"
                          />
                          <span className="truncate">{r.displayName}</span>
                        </label>
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
              Save Configuration
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
