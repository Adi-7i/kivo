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
import { budgetSchema, type BudgetFormData } from "../schemas/budget.schema";
import { EXPENSE_CATEGORIES } from "../data/previewBudgets";
import { paiseToDecimalString } from "@/lib/formatters/currency";
import { Target, Layers, Info } from "lucide-react";
import type { BudgetEntity, BudgetType } from "../types";

interface BudgetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget?: BudgetEntity | null;
  defaultType?: BudgetType;
  defaultPeriod?: string;
  onSuccess?: (data: BudgetFormData) => void;
}

export function BudgetModal({
  open,
  onOpenChange,
  budget,
  defaultType = "category",
  defaultPeriod = "2026-10",
  onSuccess,
}: BudgetModalProps) {
  const [pendingNotice, setPendingNotice] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    values: {
      type: budget?.type || defaultType,
      category: budget?.categoryName || "",
      amount: budget ? paiseToDecimalString(budget.limitPaise) : "",
      period: budget?.period || defaultPeriod,
      notes: budget?.notes || "",
    },
    resetOptions: {
      keepDirtyValues: true,
    },
  });

  const budgetType = watch("type") || defaultType;

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setPendingNotice(null);
    }
    onOpenChange(isOpen);
  };

  const handleTypeSelect = (type: BudgetType) => {
    setValue("type", type);
    if (type === "overall") {
      setValue("category", "");
    }
  };

  const onSubmit = async (data: BudgetFormData) => {
    const targetLabel =
      data.type === "overall" ? "Overall spending cap" : `Category "${data.category}"`;
    setPendingNotice(
      `Budget for ${targetLabel} (₹${data.amount} for ${data.period}) validated. In Phase 7 integration, budgets persist to Django /api/v1/budgets/.`
    );

    if (onSuccess) {
      onSuccess(data);
    }
  };

  const isEditing = Boolean(budget);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-kivo-primary/10 text-kivo-primary flex items-center justify-center">
              <Target className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-heading font-bold text-foreground">
                {isEditing ? "Edit Budget Limit" : "Create Budget Plan"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Define a spending boundary. A budget is a spending plan, not actual account balance.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Budget Type Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Budget Scope</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTypeSelect("category")}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                  budgetType === "category"
                    ? "border-kivo-primary bg-kivo-primary/10 text-kivo-primary shadow-xs"
                    : "border-border text-muted-foreground hover:bg-muted/40"
                }`}
              >
                <Layers className="size-3.5" />
                <span>Category Budget</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeSelect("overall")}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-lg border text-xs font-medium transition-all ${
                  budgetType === "overall"
                    ? "border-kivo-primary bg-kivo-primary/10 text-kivo-primary shadow-xs"
                    : "border-border text-muted-foreground hover:bg-muted/40"
                }`}
              >
                <Target className="size-3.5" />
                <span>Overall Monthly Cap</span>
              </button>
            </div>
          </div>

          {/* Category Dropdown (only when type is category) */}
          {budgetType === "category" && (
            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-xs font-medium text-foreground">
                Expense Category <span className="text-destructive">*</span>
              </Label>
              <select
                id="category"
                {...register("category")}
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Select an expense category...</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <FieldError error={errors.category?.message} />
            </div>
          )}

          {/* Limit Amount (INR) */}
          <div className="space-y-1.5">
            <Label htmlFor="amount" className="text-xs font-medium text-foreground">
              Budget Limit Amount (₹) <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">
                ₹
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="10000.00"
                {...register("amount")}
                className="pl-8 text-sm font-mono"
              />
            </div>
            <FieldError error={errors.amount?.message} />
            <p className="text-[11px] text-muted-foreground">
              Entered in Rupees, saved and verified as integer paise.
            </p>
          </div>

          {/* Period (YYYY-MM) */}
          <div className="space-y-1.5">
            <Label htmlFor="period" className="text-xs font-medium text-foreground">
              Budget Month Period <span className="text-destructive">*</span>
            </Label>
            <Input
              id="period"
              type="text"
              placeholder="2026-10"
              {...register("period")}
              className="text-sm font-mono"
            />
            <FieldError error={errors.period?.message} />
            <p className="text-[11px] text-muted-foreground">
              Format: YYYY-MM (e.g., 2026-10 for October 2026)
            </p>
          </div>

          {/* Optional Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-medium text-foreground">
              Notes & Guidelines <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Input
              id="notes"
              type="text"
              placeholder="e.g. Cap for dining out and weekend activities"
              {...register("notes")}
              className="text-sm"
            />
            <FieldError error={errors.notes?.message} />
          </div>

          {/* Invariant Warning Notice */}
          <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 text-[11px] text-muted-foreground flex items-start gap-2">
            <Info className="size-3.5 text-kivo-secondary shrink-0 mt-0.5" />
            <span>
              Reminding: A budget limit is not guaranteed money in your bank account. It is an upper
              spending ceiling.
            </span>
          </div>

          {/* Pending Backend Integration Notice */}
          {pendingNotice && (
            <div className="rounded-lg border border-kivo-secondary/30 bg-kivo-secondary/5 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-kivo-brand-dark dark:text-kivo-sage">
                  Validation Successful
                </span>
                <IntegrationPendingBadge />
              </div>
              <p className="text-xs text-muted-foreground">{pendingNotice}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
            >
              {pendingNotice ? "Done" : "Cancel"}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-kivo-primary hover:bg-kivo-brand-dark text-white font-medium"
            >
              {isEditing ? "Update Budget" : "Save Budget"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
