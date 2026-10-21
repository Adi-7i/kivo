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
import { csvExportSchema, type CSVExportFormData } from "../schemas/export.schema";
import { EXPENSE_CATEGORIES } from "@/features/budgets/data/previewBudgets";
import { Download, FileSpreadsheet, Lock, CheckCircle2 } from "lucide-react";

interface CSVExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStartDate?: string;
  defaultEndDate?: string;
}

export function CSVExportDialog({
  open,
  onOpenChange,
  defaultStartDate = "2026-10-01",
  defaultEndDate = "2026-10-31",
}: CSVExportDialogProps) {
  const [requestedExport, setRequestedExport] = React.useState<CSVExportFormData | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CSVExportFormData>({
    resolver: zodResolver(csvExportSchema),
    defaultValues: {
      startDate: defaultStartDate,
      endDate: defaultEndDate,
      accountId: "all",
      category: "all",
      transactionType: "all",
      includeHeaders: true,
    },
  });

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setRequestedExport(null);
    }
    onOpenChange(isOpen);
  };

  const onSubmit = (data: CSVExportFormData) => {
    setRequestedExport(data);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-kivo-primary/10 text-kivo-primary flex items-center justify-center">
              <FileSpreadsheet className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-heading font-bold text-foreground">
                Export Financial Ledger (CSV)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Configure date range and filter criteria for ledger transaction export
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Date Range Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startDate" className="text-xs font-medium text-foreground">
                From Date <span className="text-destructive">*</span>
              </Label>
              <Input id="startDate" type="date" {...register("startDate")} className="text-xs" />
              <FieldError error={errors.startDate?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="endDate" className="text-xs font-medium text-foreground">
                To Date <span className="text-destructive">*</span>
              </Label>
              <Input id="endDate" type="date" {...register("endDate")} className="text-xs" />
              <FieldError error={errors.endDate?.message} />
            </div>
          </div>

          {/* Account Filter */}
          <div className="space-y-1.5">
            <Label htmlFor="accountId" className="text-xs font-medium text-foreground">
              Account Filter
            </Label>
            <select
              id="accountId"
              {...register("accountId")}
              className="w-full rounded-md border border-input bg-card px-3 py-2 text-xs text-foreground ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">All Accounts (Consolidated Ledger)</option>
              <option value="acc-hdfc">HDFC Salary Account</option>
              <option value="acc-icici">ICICI Digital Wallet</option>
              <option value="acc-cash">Physical Cash Wallet</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="space-y-1.5">
            <Label htmlFor="category" className="text-xs font-medium text-foreground">
              Expense Category Filter
            </Label>
            <select
              id="category"
              {...register("category")}
              className="w-full rounded-md border border-input bg-card px-3 py-2 text-xs text-foreground ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">All Categories</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* CSV Column Format Information */}
          <div className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-2 text-xs">
            <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider block">
              Standard Output Schema (RFC 4180 CSV):
            </span>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-muted-foreground font-mono">
              <div>• Date (ISO 8601)</div>
              <div>• Transaction ID</div>
              <div>• Activity Type</div>
              <div>• Account Name</div>
              <div>• Category / Tag</div>
              <div>• Payee / Merchant</div>
              <div>• Amount (INR)</div>
              <div>• Reconciliation Notes</div>
            </div>
          </div>

          {/* Mandatory Integration Notice: No Fake CSV Generation */}
          <div className="rounded-lg border border-amber-300/40 bg-amber-500/10 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <Lock className="size-3.5 text-amber-600" />
                <span>Backend Integration Pending</span>
              </span>
              <IntegrationPendingBadge />
            </div>
            <p className="text-[11px] text-muted-foreground leading-normal">
              CSV export available after backend integration. In Phase 7, Django provides an
              authenticated, streaming CSV generation endpoint with cryptographic audit checksums.
              No fake CSV file will be fabricated locally.
            </p>
          </div>

          {/* Filter Confirmation Summary */}
          {requestedExport && (
            <div className="rounded-lg border border-kivo-primary/30 bg-kivo-primary/5 p-3 space-y-1 text-xs">
              <div className="flex items-center gap-1.5 text-kivo-primary font-semibold">
                <CheckCircle2 className="size-3.5" />
                <span>Export Configuration Validated</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Target Date Range: {requestedExport.startDate} to {requestedExport.endDate} •
                Account: {requestedExport.accountId} • Category: {requestedExport.category}
              </p>
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
              Cancel
            </Button>

            <Button
              type="submit"
              size="sm"
              className="bg-kivo-primary hover:bg-kivo-brand-dark text-white font-medium gap-1.5"
            >
              <Download className="size-3.5" />
              <span>Validate & Request Export</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
