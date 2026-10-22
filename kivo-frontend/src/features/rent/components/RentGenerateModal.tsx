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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IntegrationPendingBadge } from "@/components/shared/IntegrationPendingBadge";
import { Calendar, Sparkles } from "lucide-react";
import type { RentPlanEntity } from "../types";

interface RentGenerateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: RentPlanEntity;
  onSuccess?: () => void;
}

export function RentGenerateModal({
  open,
  onOpenChange,
  plan,
  onSuccess,
}: RentGenerateModalProps) {
  const [throughDate, setThroughDate] = React.useState("2026-12-31");
  const [pendingNotice, setPendingNotice] = React.useState<string | null>(null);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setPendingNotice(null);
    }
    onOpenChange(isOpen);
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setPendingNotice(
      `Backend integration pending: POST /api/v1/rent/plans/${plan.id}/generate/ with through="${throughDate}". Will generate recurring monthly obligations in remote Django database.`
    );
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md w-full border-border bg-card">
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-kivo-sage/20 border border-kivo-sage/40 text-kivo-brand-dark dark:text-kivo-sage flex items-center justify-center">
              <Sparkles className="size-4" />
            </div>
            <DialogTitle className="text-lg font-bold font-heading">
              Generate Rent Obligations
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Generate upcoming monthly obligations for{" "}
            <span className="font-semibold text-foreground">{plan.title}</span>.
          </DialogDescription>
        </DialogHeader>

        {pendingNotice && (
          <IntegrationPendingBadge variant="banner" message={pendingNotice} />
        )}

        <form onSubmit={handleGenerate} className="space-y-4 pt-1 text-left">
          <div className="space-y-1.5">
            <Label htmlFor="through-date" className="text-xs font-semibold text-foreground">
              Generate Obligations Through
            </Label>
            <div className="relative">
              <Input
                id="through-date"
                type="date"
                value={throughDate}
                onChange={(e) => setThroughDate(e.target.value)}
                required
                className="text-xs bg-muted/20"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              The backend rent engine will create obligations for each month up to this date based on the plan&apos;s due-day rule.
            </p>
          </div>

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
              className="text-xs bg-kivo-primary hover:bg-kivo-brand-dark text-white gap-1.5"
            >
              <Calendar className="size-3.5" />
              <span>Generate Obligations</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
