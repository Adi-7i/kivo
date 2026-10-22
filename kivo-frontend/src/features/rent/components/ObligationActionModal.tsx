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
  obligationActionSchema,
  type ObligationActionFormData,
} from "../schemas/obligation-action.schema";
import { FastForward, RotateCcw } from "lucide-react";
import type { RentObligationEntity } from "../types";

interface ObligationActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  obligation?: RentObligationEntity | null;
  action: "skip" | "reopen";
  onSuccess?: () => void;
}

export function ObligationActionModal({
  open,
  onOpenChange,
  obligation,
  action,
  onSuccess,
}: ObligationActionModalProps) {
  const isSkip = action === "skip";
  const [pendingNotice, setPendingNotice] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ObligationActionFormData>({
    resolver: zodResolver(obligationActionSchema),
    values: {
      action,
      reason: "",
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

  const onSubmit = async (data: ObligationActionFormData) => {
    setPendingNotice(
      `Obligation ${obligation?.month.substring(0, 7)} ${isSkip ? "skip" : "reopen"} validated with reason: "${data.reason}". In Phase 7 integration, this posts to Django /api/v1/rent/obligations/{id}/change/.`
    );
    if (onSuccess) onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
            {isSkip ? (
              <FastForward className="size-5 text-amber-700" />
            ) : (
              <RotateCcw className="size-5 text-kivo-primary" />
            )}
            <span>{isSkip ? "Skip Rent Obligation" : "Reopen Rent Obligation"}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isSkip
              ? "Skipping an obligation removes pending dues for this cycle and releases unassigned reserves. An auditable reason is strictly required."
              : "Reopening an obligation reactivates outstanding dues for this cycle."}
          </DialogDescription>
        </DialogHeader>

        {obligation && (
          <div className="rounded-lg border border-border/80 bg-muted/20 p-2.5 text-xs text-foreground font-medium">
            Cycle: {obligation.month.substring(0, 7)} (Due {obligation.dueDate})
          </div>
        )}

        {pendingNotice && (
          <div className="rounded-lg border border-kivo-sage/50 bg-kivo-sage/15 p-3 text-xs text-kivo-brand-dark dark:text-kivo-sage space-y-1">
            <div className="flex items-center gap-1.5 font-medium">
              <IntegrationPendingBadge />
              <span>Action Recorded in Frontend</span>
            </div>
            <p className="text-[11px] opacity-90">{pendingNotice}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="obligation-reason" className="text-xs font-medium">
              Auditable Reason <span className="text-destructive">*</span>
            </Label>
            <Input
              id="obligation-reason"
              placeholder={
                isSkip
                  ? "e.g. Deposit adjusted with landlord / Tenant travelled away"
                  : "e.g. Skipped by mistake; payment due this month"
              }
              {...register("reason")}
              className="text-sm"
              autoFocus
            />
            {errors.reason && <FieldError message={errors.reason.message} />}
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
                isSkip
                  ? "bg-amber-700 hover:bg-amber-800"
                  : "bg-kivo-primary hover:bg-kivo-brand-dark"
              }`}
            >
              {isSkip ? "Confirm Skip" : "Confirm Reopen"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
