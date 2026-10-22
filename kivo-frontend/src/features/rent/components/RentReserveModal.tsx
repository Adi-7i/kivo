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
import {
  createReserveSchema,
  adjustReserveSchema,
  type CreateReserveFormData,
  type AdjustReserveFormData,
} from "../schemas/rent-reserve.schema";
import { paiseToDecimalString } from "@/lib/formatters/currency";
import { ShieldCheck, Info } from "lucide-react";
import type { RentReserveEntity, RentObligationEntity } from "../types";

interface RentReserveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reserve?: RentReserveEntity | null;
  obligations?: RentObligationEntity[];
  onSuccess?: () => void;
}

export function RentReserveModal({
  open,
  onOpenChange,
  reserve,
  obligations = [],
  onSuccess,
}: RentReserveModalProps) {
  const isAdjusting = Boolean(reserve);
  const [pendingNotice, setPendingNotice] = React.useState<string | null>(null);

  // Form for adjusting
  const adjustForm = useForm<AdjustReserveFormData>({
    resolver: zodResolver(adjustReserveSchema),
    values: {
      targetAmount: reserve ? paiseToDecimalString(reserve.reservedPaise) : "0",
      reason: "",
    },
    resetOptions: {
      keepDirtyValues: false,
    },
  });

  // Form for creating
  const createForm = useForm<CreateReserveFormData>({
    resolver: zodResolver(createReserveSchema),
    values: {
      obligationId: obligations[0]?.id || "",
      label: "Upcoming Rent Earmark",
      amount: "10000",
      reason: "Ring-fence rent allocation from current liquid balance",
    },
    resetOptions: {
      keepDirtyValues: false,
    },
  });

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setPendingNotice(null);
    }
    onOpenChange(isOpen);
  };

  const onAdjustSubmit = async (data: AdjustReserveFormData) => {
    const isRelease = parseFloat(data.targetAmount) === 0;
    setPendingNotice(
      isRelease
        ? `Reserve release to ₹0 validated. In Phase 7 integration, this posts to Django /api/v1/rent/reserves/{id}/adjust/.`
        : `Reserve adjustment to ₹${data.targetAmount} validated with auditable reason: "${data.reason}".`
    );
    if (onSuccess) onSuccess();
  };

  const onCreateSubmit = async (data: CreateReserveFormData) => {
    setPendingNotice(
      `Reserve "${data.label}" for ₹${data.amount} validated. In Phase 7 integration, this posts to Django /api/v1/rent/reserves/.`
    );
    if (onSuccess) onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="size-5 text-amber-700" />
            <span>
              {isAdjusting ? "Adjust Rent Reserve Earmark" : "Create Rent Reserve Earmark"}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Reserves ring-fence actual liquid cash to protect upcoming rent dues. Earmarks reduce
            your Safe-to-Spend without moving money out of your accounts.
          </DialogDescription>
        </DialogHeader>

        {/* Financial Invariant Notice */}
        <div className="rounded-lg border border-border/80 bg-muted/20 p-3 text-xs flex items-start gap-2">
          <Info className="size-4 shrink-0 text-kivo-secondary mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-normal">
            <strong className="text-foreground">Reserves Law:</strong> Setting or adjusting a
            reserve modifies your Safe-to-Spend capacity. Setting the target amount to 0 releases
            the reserve back into disposable spending.
          </p>
        </div>

        {pendingNotice && (
          <div className="rounded-lg border border-kivo-sage/50 bg-kivo-sage/15 p-3 text-xs text-kivo-brand-dark dark:text-kivo-sage space-y-1">
            <div className="flex items-center gap-1.5 font-medium">
              <IntegrationPendingBadge />
              <span>Reserve Operation Validated in Frontend</span>
            </div>
            <p className="text-[11px] opacity-90">{pendingNotice}</p>
          </div>
        )}

        {isAdjusting ? (
          /* Adjust Form */
          <form onSubmit={adjustForm.handleSubmit(onAdjustSubmit)} className="space-y-3.5 py-1">
            <div className="space-y-1 text-xs">
              <span className="text-muted-foreground">Current Reserve Earmark:</span>
              <div className="font-semibold text-sm text-foreground">{reserve?.label}</div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="target-amount" className="text-xs font-medium">
                New Target Amount (₹) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="target-amount"
                type="text"
                placeholder="0 to release, or new amount"
                {...adjustForm.register("targetAmount")}
                className="text-sm font-mono"
              />
              <span className="text-[11px] text-muted-foreground block">
                Enter 0 to release this reserve completely.
              </span>
              {adjustForm.formState.errors.targetAmount && (
                <FieldError message={adjustForm.formState.errors.targetAmount.message} />
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adjust-reason" className="text-xs font-medium">
                Auditable Reason for Adjustment <span className="text-destructive">*</span>
              </Label>
              <Input
                id="adjust-reason"
                placeholder="e.g. Salary credited; increased rent protection"
                {...adjustForm.register("reason")}
                className="text-sm"
              />
              {adjustForm.formState.errors.reason && (
                <FieldError message={adjustForm.formState.errors.reason.message} />
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/50">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={adjustForm.formState.isSubmitting}
                className="bg-kivo-primary hover:bg-kivo-brand-dark text-white font-medium"
              >
                Save Adjustment
              </Button>
            </div>
          </form>
        ) : (
          /* Create Form */
          <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-3.5 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="reserve-obligation" className="text-xs font-medium">
                Link to Rent Obligation <span className="text-destructive">*</span>
              </Label>
              <select
                id="reserve-obligation"
                {...createForm.register("obligationId")}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-hidden"
              >
                {obligations.map((ob) => (
                  <option key={ob.id} value={ob.id}>
                    Cycle {ob.month.substring(0, 7)} (Due {ob.dueDate}) - Gross ₹
                    {(ob.amountPaise / 100).toFixed(2)}
                  </option>
                ))}
              </select>
              {createForm.formState.errors.obligationId && (
                <FieldError message={createForm.formState.errors.obligationId.message} />
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reserve-label" className="text-xs font-medium">
                Reserve Label <span className="text-destructive">*</span>
              </Label>
              <Input
                id="reserve-label"
                placeholder="e.g. November Rent Earmark"
                {...createForm.register("label")}
                className="text-sm"
              />
              {createForm.formState.errors.label && (
                <FieldError message={createForm.formState.errors.label.message} />
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reserve-amount" className="text-xs font-medium">
                Amount to Protect (₹) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="reserve-amount"
                type="text"
                placeholder="e.g. 10000"
                {...createForm.register("amount")}
                className="text-sm font-mono"
              />
              {createForm.formState.errors.amount && (
                <FieldError message={createForm.formState.errors.amount.message} />
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reserve-reason" className="text-xs font-medium">
                Reason / Source <span className="text-destructive">*</span>
              </Label>
              <Input
                id="reserve-reason"
                placeholder="e.g. Ring-fenced from October salary"
                {...createForm.register("reason")}
                className="text-sm"
              />
              {createForm.formState.errors.reason && (
                <FieldError message={createForm.formState.errors.reason.message} />
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/50">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createForm.formState.isSubmitting}
                className="bg-kivo-primary hover:bg-kivo-brand-dark text-white font-medium"
              >
                Create Reserve
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
