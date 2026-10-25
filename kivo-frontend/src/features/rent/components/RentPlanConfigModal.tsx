"use client";
import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
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
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { FinancialWriteStatus, useFinancialWrite } from "@/features/finance/useFinancialWrite";
import { QueryState } from "@/features/finance/QueryState";
import { useCategories } from "@/features/finance/queries";
import { useContacts } from "@/features/relationships/queries";
import { useTodayInKolkata } from "@/features/relationships/useToday";
import { normalizeOpeningBalance } from "@/features/onboarding/money";
import { rentPlanSchema, type RentPlanFormData } from "../schemas/rent-plan.schema";
import { type PlanDTO, type PlanInput } from "../api";
import type { RentPlanEntity } from "../types";
import { Settings2 } from "lucide-react";
import { RentField, rentSelectClass } from "./RentField";

function PlanActiveForm({ plan, onClose }: { plan: RentPlanEntity; onClose: () => void }) {
  const write = useFinancialWrite("rent-plan:" + plan.id + ":active", true);
  const { register, handleSubmit } = useForm<{ active: boolean }>({
    resolver: zodResolver(z.object({ active: z.boolean() })),
    defaultValues: { active: plan.active },
  });
  return (
    <>
      <p className="rounded-lg border bg-muted/20 p-3 text-xs">
        Rent terms and participant shares are fixed after creation. Activate/deactivate this plan,
        or create a new plan for different terms.
      </p>
      <div className="space-y-2 text-xs">
        <p>
          {plan.title} • {plan.payee}
        </p>
        <p>
          Starts {plan.startDate} • Due {plan.dueDay ?? "last day"}
        </p>
        {plan.shares.map((s) => (
          <p key={s.contactId ?? "owner"}>
            {s.displayName}: <MoneyAmount paise={s.amountPaise} size="sm" />
          </p>
        ))}
      </div>
      <FinancialWriteStatus write={write} onConfirmed={onClose} />
      <form
        onSubmit={handleSubmit(async (data) => {
          if (await write.run<PlanDTO>("/api/v1/rent/plans/" + plan.id + "/", data, "PATCH"))
            onClose();
        })}
      >
        <fieldset disabled={write.busy || write.pending} className="space-y-4">
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" {...register("active")} />
            Active Rent Plan
          </label>
          <Button type="submit">Save Active Status</Button>
        </fieldset>
      </form>
    </>
  );
}
function CreatePlanForm({ onClose }: { onClose: () => void }) {
  const contacts = useContacts(),
    categories = useCategories(),
    today = useTodayInKolkata();
  const write = useFinancialWrite("rent-plan:create", true);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RentPlanFormData>({
    resolver: zodResolver(rentPlanSchema),
    values: {
      title: "",
      payee: "",
      amount: "",
      category: "",
      startDate: today,
      dueDayRule: "last_day",
      dueDay: null,
      isShared: false,
      splitMethod: "equal",
      roommateContactIds: [],
      customShares: {},
      active: true,
    },
    resetOptions: { keepDirtyValues: true },
  });
  const shared = useWatch({ control, name: "isShared" }),
    method = useWatch({ control, name: "splitMethod" }),
    rule = useWatch({ control, name: "dueDayRule" }),
    selected = useWatch({ control, name: "roommateContactIds" }) ?? [];
  const activeContacts = contacts.data?.filter((c) => !c.archived) ?? [];
  const onSubmit = async (data: RentPlanFormData) => {
    const ids = data.isShared ? data.roommateContactIds : [];
    const custom = data.isShared && data.splitMethod === "custom";
    const body: PlanInput = {
      title: data.title,
      payee: data.payee,
      amount: normalizeOpeningBalance(data.amount),
      start_date: data.startDate,
      due_day: data.dueDayRule === "last_day" ? null : data.dueDay,
      category: data.category,
      split_method: custom ? "custom" : "equal",
      participants: [
        {
          contact: null,
          ...(custom ? { amount: normalizeOpeningBalance(data.customShares.user ?? "") } : {}),
        },
        ...ids.map((contact) => ({
          contact,
          ...(custom ? { amount: normalizeOpeningBalance(data.customShares[contact] ?? "") } : {}),
        })),
      ],
    };
    if (await write.run<PlanDTO>("/api/v1/rent/plans/", body)) onClose();
  };
  return (
    <>
      <FinancialWriteStatus write={write} onConfirmed={onClose} />
      <QueryState query={contacts} />
      <QueryState query={categories} />
      <form onSubmit={handleSubmit(onSubmit)}>
        <fieldset disabled={write.pending || write.busy} className="space-y-4 py-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <RentField id="plan-title" label="Plan Name / Label" error={errors.title?.message}>
              <Input id="plan-title" {...register("title")} />
            </RentField>
            <RentField id="plan-payee" label="Landlord / Payee Name" error={errors.payee?.message}>
              <Input id="plan-payee" {...register("payee")} />
            </RentField>
            <RentField
              id="plan-amount"
              label="Gross Monthly Rent (₹)"
              error={errors.amount?.message}
            >
              <Input id="plan-amount" inputMode="decimal" {...register("amount")} />
            </RentField>
            <RentField id="plan-start" label="Plan Start Date" error={errors.startDate?.message}>
              <Input id="plan-start" type="date" {...register("startDate")} />
            </RentField>
          </div>
          <RentField id="plan-category" label="Rent Category" error={errors.category?.message}>
            <select id="plan-category" className={rentSelectClass} {...register("category")}>
              <option value="">Choose category</option>
              {categories.data
                ?.filter(
                  (c) =>
                    !c.archived &&
                    (!c.parent || !categories.data?.find((p) => p.id === c.parent)?.archived)
                )
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </RentField>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Button
              type="button"
              variant={rule === "fixed_day" ? "default" : "outline"}
              onClick={() => {
                setValue("dueDayRule", "fixed_day");
                setValue("dueDay", 5);
              }}
            >
              Fixed Day of Month
            </Button>
            <Button
              type="button"
              variant={rule === "last_day" ? "default" : "outline"}
              onClick={() => {
                setValue("dueDayRule", "last_day");
                setValue("dueDay", null);
              }}
            >
              Last Day of Month
            </Button>
          </div>
          {rule === "fixed_day" && (
            <RentField id="plan-day" label="Day of Month (1–31)" error={errors.dueDay?.message}>
              <Input id="plan-day" type="number" {...register("dueDay", { valueAsNumber: true })} />
            </RentField>
          )}
          <p className="text-xs text-muted-foreground">
            Due days are adjusted to the last available day in shorter months.
          </p>
          <label className="flex gap-2 items-center text-xs">
            <input type="checkbox" {...register("isShared")} />
            This is a Shared Rent Plan with Flatmates
          </label>
          {shared && (
            <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
              <RentField id="plan-split" label="Split Method">
                <select id="plan-split" {...register("splitMethod")} className={rentSelectClass}>
                  <option value="equal">Equal (shares confirmed on creation)</option>
                  <option value="custom">Custom amounts</option>
                </select>
              </RentField>
              {method === "custom" && (
                <RentField id="plan-owner-share" label="Your Custom Share (₹)">
                  <Input
                    id="plan-owner-share"
                    {...register("customShares.user")}
                    inputMode="decimal"
                  />
                </RentField>
              )}
              {activeContacts.map((c) => (
                <div key={c.id} className="space-y-1">
                  <label className="flex gap-2 items-center text-xs">
                    <input type="checkbox" value={c.id} {...register("roommateContactIds")} />
                    {c.display_name}
                  </label>
                  {method === "custom" && selected.includes(c.id) && (
                    <RentField
                      id={"plan-share-" + c.id}
                      label={"Custom share for " + c.display_name + " (₹)"}
                    >
                      <Input
                        id={"plan-share-" + c.id}
                        {...register(("customShares." + c.id) as "customShares.user")}
                        inputMode="decimal"
                      />
                    </RentField>
                  )}
                </div>
              ))}
              {typeof errors.customShares?.message === "string" && (
                <p role="alert" className="text-xs text-destructive">
                  {errors.customShares.message}
                </p>
              )}
              {errors.roommateContactIds && (
                <p role="alert" className="text-xs text-destructive">
                  {errors.roommateContactIds.message}
                </p>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            You are included exactly once. Creating a plan posts no expense or bank payment. Equal
            shares and remainder paise are confirmed when the plan is created.
          </p>
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Create Rent Plan</Button>
          </div>
        </fieldset>
      </form>
    </>
  );
}
export function RentPlanConfigModal({
  open,
  onOpenChange,
  plan,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plan?: RentPlanEntity | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex gap-2 items-center font-heading">
            <Settings2 className="size-5 text-kivo-primary" />
            {plan ? "Configure Monthly Rent Plan" : "Create Monthly Rent Plan"}
          </DialogTitle>
          <DialogDescription>
            Manage rent terms and confirmed participant shares without initiating bank transfers.
          </DialogDescription>
        </DialogHeader>
        {plan ? (
          <PlanActiveForm plan={plan} onClose={() => onOpenChange(false)} />
        ) : (
          <CreatePlanForm onClose={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
