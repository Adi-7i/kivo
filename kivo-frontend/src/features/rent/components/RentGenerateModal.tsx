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
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@/lib/utils/zodResolver";
import { calendarDate } from "@/features/finance/validation";
import { useTodayInKolkata } from "@/features/relationships/useToday";
import { FinancialWriteStatus, useFinancialWrite } from "@/features/finance/useFinancialWrite";
import { FieldError } from "@/features/auth/components/FieldError";
import type { PlanDTO } from "../api";
import { Calendar, Sparkles } from "lucide-react";
import type { RentPlanEntity } from "../types";

interface RentGenerateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: RentPlanEntity;
  onSuccess?: () => void;
}

export function RentGenerateModal({ open, onOpenChange, plan, onSuccess }: RentGenerateModalProps) {
  const today = useTodayInKolkata();
  const write = useFinancialWrite("rent-plan:" + plan.id + ":generate", true);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ through: string }>({
    resolver: zodResolver(z.object({ through: calendarDate })),
    values: { through: today },
    resetOptions: { keepDirtyValues: true },
  });
  const handleOpenChange = onOpenChange;
  const handleGenerate = async (data: { through: string }) => {
    if (await write.run<PlanDTO>("/api/v1/rent/plans/" + plan.id + "/generate/", data)) {
      onSuccess?.();
      onOpenChange(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md w-[calc(100%-2rem)] border-border bg-card">
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

        <FinancialWriteStatus write={write} onConfirmed={() => onOpenChange(false)} />

        <form onSubmit={handleSubmit(handleGenerate)} className="space-y-4 pt-1 text-left">
          <fieldset disabled={write.pending || write.busy} className="space-y-4 min-w-0">
            <div className="space-y-1.5">
              <Label htmlFor="through-date" className="text-xs font-semibold text-foreground">
                Generate Obligations Through
              </Label>
              <div className="relative">
                <Input
                  id="through-date"
                  type="date"
                  {...register("through")}
                  required
                  className="text-xs bg-muted/20"
                />
              </div>
              {errors.through && <FieldError message={errors.through.message} />}
              <p className="text-[10px] text-muted-foreground">
                Kivo generates obligations whose due dates fall between the plan start and the
                selected date, inclusive. Choose a future cutoff to include upcoming dues. Existing
                months are preserved. Generation does not withdraw cash or recognize expense.
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
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
