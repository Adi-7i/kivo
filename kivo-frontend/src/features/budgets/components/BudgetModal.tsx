"use client";
import { useForm, useWatch } from "react-hook-form";
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
import { useCategories } from "@/features/finance/queries";
import { QueryState } from "@/features/finance/QueryState";
import { useFinancialWrite, FinancialWriteStatus } from "@/features/finance/useFinancialWrite";
import { normalizeOpeningBalance, todayInKolkata } from "@/features/onboarding/money";
import { budgetSchema, type BudgetFormData } from "../schemas/budget.schema";
import { monthBounds, type BudgetDTO, type BudgetInput } from "../api";

export function BudgetModal({
  open,
  onOpenChange,
  budget,
  defaultType = "category",
  defaultPeriod = todayInKolkata().slice(0, 7),
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget?: BudgetDTO | null;
  defaultType?: "overall" | "category";
  defaultPeriod?: string;
}) {
  const categories = useCategories(open);
  const write = useFinancialWrite("budget-" + (budget?.id ?? "create"), true);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      name: budget?.name ?? "",
      type: budget?.category ? "category" : budget ? "overall" : defaultType,
      category: budget?.category ?? "",
      amount: budget?.limit ?? "",
      periodType: budget?.period_type === "custom" ? "custom" : "monthly",
      period: budget?.period_start.slice(0, 7) ?? defaultPeriod,
      start: budget?.period_start ?? defaultPeriod + "-01",
      end: budget?.period_end ?? monthBounds(defaultPeriod).end,
      warning: String(budget?.warning_percent ?? 80),
      archived: budget?.archived ?? false,
    },
  });
  const scope = useWatch({ control, name: "type" }),
    periodType = useWatch({ control, name: "periodType" });
  const submit = async (data: BudgetFormData) => {
    const dates =
      data.periodType === "monthly"
        ? monthBounds(data.period)
        : { start: data.start, end: data.end };
    const body: BudgetInput = {
      name: data.name,
      category: data.type === "overall" ? null : data.category,
      period_type: data.periodType,
      period_start: dates.start,
      period_end: dates.end,
      limit: normalizeOpeningBalance(data.amount),
      warning_percent: Number(data.warning),
      archived: data.archived,
    };
    // An unchanged archived category need not be revalidated as a new selection.
    const payload =
      budget && body.category === budget.category
        ? Object.fromEntries(Object.entries(body).filter(([key]) => key !== "category"))
        : body;
    const result = await write.run<BudgetDTO>(
      "/api/v1/budgets/" + (budget ? budget.id + "/" : ""),
      payload,
      budget ? "PATCH" : "POST"
    );
    if (result) onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{budget ? "Edit Budget Limit" : "Create Budget Plan"}</DialogTitle>
          <DialogDescription>
            A spending limit is a plan, separate from account balance and safe-to-spend.
          </DialogDescription>
        </DialogHeader>
        <QueryState query={categories} />
        <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
          <fieldset disabled={write.busy || write.pending} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="budget-name">Budget name</Label>
              <Input id="budget-name" {...register("name")} aria-invalid={!!errors.name} />
              <FieldError error={errors.name?.message} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="budget-scope">Budget Scope</Label>
                <select
                  id="budget-scope"
                  {...register("type")}
                  className="w-full rounded-md border bg-background p-2 text-sm"
                >
                  <option value="overall">Overall Budget</option>
                  <option value="category">Category Budget</option>
                </select>
              </div>
              <div>
                <Label htmlFor="budget-period-type">Period type</Label>
                <select
                  id="budget-period-type"
                  {...register("periodType")}
                  className="w-full rounded-md border bg-background p-2 text-sm"
                >
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom inclusive range</option>
                </select>
              </div>
            </div>
            {scope === "category" && (
              <div>
                <Label htmlFor="budget-category">Expense Category</Label>
                <select
                  id="budget-category"
                  {...register("category")}
                  className="w-full rounded-md border bg-background p-2 text-sm"
                >
                  <option value="">Select a category...</option>
                  {(categories.data ?? [])
                    .filter((c) => !c.archived || c.id === budget?.category)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.archived ? " (archived)" : ""}
                      </option>
                    ))}
                </select>
                <FieldError error={errors.category?.message} />
              </div>
            )}
            <div>
              <Label htmlFor="budget-amount">Budget Limit Amount (₹)</Label>
              <Input
                id="budget-amount"
                inputMode="decimal"
                {...register("amount")}
                aria-invalid={!!errors.amount}
              />
              <FieldError error={errors.amount?.message} />
              <p className="text-[11px] text-muted-foreground">
                Zero limits are supported; utilization is then undefined.
              </p>
            </div>
            {periodType === "monthly" ? (
              <div>
                <Label htmlFor="budget-month">Budget Month Period</Label>
                <Input id="budget-month" type="month" {...register("period")} />
                <FieldError error={errors.period?.message} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {(["start", "end"] as const).map((key) => (
                  <div key={key}>
                    <Label htmlFor={"budget-" + key}>
                      {key === "start" ? "From Date" : "To Date"}
                    </Label>
                    <Input id={"budget-" + key} type="date" {...register(key)} />
                    <FieldError error={errors[key]?.message} />
                  </div>
                ))}
              </div>
            )}
            <div>
              <Label htmlFor="budget-warning">Warning threshold (%)</Label>
              <Input id="budget-warning" inputMode="numeric" {...register("warning")} />
              <FieldError error={errors.warning?.message} />
            </div>
            {budget && (
              <label className="flex gap-2 text-sm">
                <input type="checkbox" {...register("archived")} />
                Archived
              </label>
            )}
          </fieldset>
          <FinancialWriteStatus write={write} onConfirmed={() => onOpenChange(false)} />
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                write.busy || write.pending || (scope === "category" && !categories.isSuccess)
              }
            >
              {write.busy ? "Saving…" : budget ? "Update Budget" : "Save Budget"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
