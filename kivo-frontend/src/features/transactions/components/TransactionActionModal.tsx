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
  transactionActionSchema,
  type TransactionActionFormData,
} from "../schemas/transaction-action.schema";
import { RotateCcw, Ban, Edit3, ShieldAlert } from "lucide-react";
import type { TransactionEntity } from "../types";

interface TransactionActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TransactionEntity;
  onSuccess?: () => void;
}

export function TransactionActionModal({
  open,
  onOpenChange,
  transaction,
  onSuccess,
}: TransactionActionModalProps) {
  const [actionType, setActionType] = React.useState<"reversal" | "void" | "correction">("reversal");
  const [pendingNotice, setPendingNotice] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransactionActionFormData>({
    resolver: zodResolver(transactionActionSchema),
    values: {
      actionType,
      reason: "",
      title: transaction.title || "",
      merchant: transaction.merchant || "",
      notes: transaction.notes || "",
    },
  });

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setPendingNotice(null);
      reset();
    }
    onOpenChange(isOpen);
  };

  const handleTypeChange = (type: "reversal" | "void" | "correction") => {
    setActionType(type);
    setValue("actionType", type);
    setPendingNotice(null);
  };

  const onSubmit = async (data: TransactionActionFormData) => {
    let endpoint = "";
    if (data.actionType === "reversal") {
      endpoint = `POST /api/v1/transactions/${transaction.id}/reverse/`;
    } else if (data.actionType === "void") {
      endpoint = `POST /api/v1/transactions/${transaction.id}/void/`;
    } else {
      endpoint = `POST /api/v1/transactions/${transaction.id}/correct/`;
    }

    setPendingNotice(
      `Backend integration pending: ${endpoint} with Idempotency-Key header. Reason: "${data.reason}". No database mutation occurred.`
    );
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg w-full border-border bg-card">
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center">
              <RotateCcw className="size-4" />
            </div>
            <DialogTitle className="text-lg font-bold font-heading">
              Ledger Correction & Reversal
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Transaction: <span className="font-semibold text-foreground">{transaction.title}</span> &bull; Ref #{transaction.id}
          </DialogDescription>
        </DialogHeader>

        {/* Integration pending banner */}
        <IntegrationPendingBadge
          variant="banner"
          message="Backend API pending: Ledger reversal and void actions will connect to the Django Financial API with Idempotency-Key in subsequent phases."
        />

        {/* Immutable ledger explanation notice */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2.5 text-left text-xs">
          <ShieldAlert className="size-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-amber-950 dark:text-amber-200">
              Immutable Accounting Standard
            </p>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              In Kivo&apos;s double-entry ledger, posted entries are never erased. A reversal writes a mirror balancing event with identical integer paise to nullify the effect.
            </p>
          </div>
        </div>

        {pendingNotice && (
          <IntegrationPendingBadge variant="banner" message={pendingNotice} />
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {/* Action Type Selector */}
          <div className="space-y-1.5 text-left">
            <Label className="text-xs font-semibold text-foreground">
              Select Action Type
            </Label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleTypeChange("reversal")}
                className={`py-2 px-2.5 rounded-lg border font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  actionType === "reversal"
                    ? "border-destructive bg-destructive/10 text-destructive"
                    : "border-border text-muted-foreground hover:bg-muted/40"
                }`}
              >
                <RotateCcw className="size-3.5" />
                <span>Reversal</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange("void")}
                className={`py-2 px-2.5 rounded-lg border font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  actionType === "void"
                    ? "border-destructive bg-destructive/10 text-destructive"
                    : "border-border text-muted-foreground hover:bg-muted/40"
                }`}
              >
                <Ban className="size-3.5" />
                <span>Void</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange("correction")}
                className={`py-2 px-2.5 rounded-lg border font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  actionType === "correction"
                    ? "border-kivo-primary bg-kivo-primary/10 text-kivo-primary"
                    : "border-border text-muted-foreground hover:bg-muted/40"
                }`}
              >
                <Edit3 className="size-3.5" />
                <span>Correct</span>
              </button>
            </div>
          </div>

          {/* Audit Reason */}
          <div className="space-y-1.5 text-left">
            <Label htmlFor="action-reason" className="text-xs font-semibold text-foreground">
              Audit Reason <span className="text-destructive">*</span>
            </Label>
            <Input
              id="action-reason"
              placeholder="e.g. Accidental duplicate charge entered by user"
              {...register("reason")}
              className="text-xs bg-muted/20"
            />
            {errors.reason && <FieldError message={errors.reason.message} />}
            <p className="text-[10px] text-muted-foreground">
              Durable explanation recorded in the financial audit log (minimum 5 characters).
            </p>
          </div>

          {/* Additional fields for correction */}
          {actionType === "correction" && (
            <div className="space-y-3 pt-2 border-t border-border/60">
              <div className="space-y-1.5 text-left">
                <Label htmlFor="corr-title" className="text-xs font-semibold text-foreground">
                  Corrected Title
                </Label>
                <Input
                  id="corr-title"
                  {...register("title")}
                  className="text-xs bg-muted/20"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <Label htmlFor="corr-merchant" className="text-xs font-semibold text-foreground">
                  Corrected Merchant / Payee
                </Label>
                <Input
                  id="corr-merchant"
                  {...register("merchant")}
                  className="text-xs bg-muted/20"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <Label htmlFor="corr-notes" className="text-xs font-semibold text-foreground">
                  Updated Notes & Memorandum
                </Label>
                <Input
                  id="corr-notes"
                  {...register("notes")}
                  className="text-xs bg-muted/20"
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className={`text-xs text-white gap-1.5 ${
                actionType === "correction"
                  ? "bg-kivo-primary hover:bg-kivo-brand-dark"
                  : "bg-destructive hover:bg-destructive/90"
              }`}
            >
              <RotateCcw className="size-3.5" />
              <span>
                {actionType === "reversal"
                  ? "Execute Reversal"
                  : actionType === "void"
                  ? "Void Transaction"
                  : "Save Correction"}
              </span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
