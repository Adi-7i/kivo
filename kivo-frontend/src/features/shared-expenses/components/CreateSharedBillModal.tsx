"use client";
import * as React from "react";
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
import { sharedBillSchema, type SharedBillFormData } from "../schemas/shared-bill.schema";
import { useContacts } from "@/features/relationships/queries";
import { useAccounts, useCategories } from "@/features/finance/queries";
import { useTodayInKolkata } from "@/features/relationships/useToday";
import { normalizeOpeningBalance } from "@/features/onboarding/money";
import { FinancialWriteStatus, useFinancialWrite } from "@/features/finance/useFinancialWrite";
import { QueryState } from "@/features/finance/QueryState";
import type { BillDTO, BillInput } from "@/features/relationships/api";
import type { ContactEntity } from "@/features/people/types";
import { Users, Info } from "lucide-react";
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialBill?: BillDTO;
  contacts?: ContactEntity[];
  accounts?: { id: string; name: string }[];
  onSuccess?: (data: SharedBillFormData) => void;
}
export function CreateSharedBillModal({ open, onOpenChange, initialBill, onSuccess }: Props) {
  const contacts = useContacts(open),
    accounts = useAccounts(open),
    categories = useCategories(open),
    today = useTodayInKolkata();
  const write = useFinancialWrite(
    initialBill ? `bill:${initialBill.id}:correct` : "bill:create",
    true
  );
  const values = React.useMemo<SharedBillFormData>(
    () => ({
      title: initialBill?.event.title ?? "",
      amount: initialBill?.event.amount ?? "",
      category: initialBill?.event.category ?? "",
      effectiveDate: initialBill?.event.effective_date ?? today,
      payerType: initialBill?.payer ? "friend" : "user",
      payerContactId: initialBill?.payer ?? "",
      accountId: initialBill?.event.account ?? "",
      splitMethod: initialBill?.split_method ?? "equal",
      merchant: initialBill?.event.merchant ?? "",
      notes: initialBill?.event.notes ?? "",
      selectedParticipants:
        initialBill?.shares.flatMap((s) => (s.contact ? [s.contact] : [])) ?? [],
      customShares: Object.fromEntries(
        initialBill?.shares.map((s) => [s.contact ?? "user", s.amount]) ?? []
      ),
      reason: "",
    }),
    [initialBill, today]
  );
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SharedBillFormData>({
    resolver: zodResolver(sharedBillSchema),
    values,
    resetOptions: { keepDirtyValues: true },
  });
  const payerType = useWatch({ control, name: "payerType" }),
    method = useWatch({ control, name: "splitMethod" }),
    selected = useWatch({ control, name: "selectedParticipants" }) ?? [];
  const onSubmit = async (data: SharedBillFormData) => {
    if (initialBill && data.reason.trim().length < 5) {
      setError("reason", { message: "An audit reason of at least 5 characters is required" });
      return;
    }
    const participants: BillInput["participants"] = [
      {
        contact: null,
        ...(data.splitMethod === "custom"
          ? { amount: normalizeOpeningBalance(data.customShares.user ?? "") }
          : {}),
      },
      ...data.selectedParticipants.map((contact) => ({
        contact,
        ...(data.splitMethod === "custom"
          ? { amount: normalizeOpeningBalance(data.customShares[contact] ?? "") }
          : {}),
      })),
    ];
    const body: BillInput = {
      title: data.title,
      amount: normalizeOpeningBalance(data.amount),
      category: data.category,
      effective_date: data.effectiveDate,
      payer: data.payerType === "friend" ? data.payerContactId : null,
      account: data.payerType === "user" ? data.accountId : null,
      split_method: data.splitMethod,
      participants,
      merchant: data.merchant,
      notes: data.notes,
    };
    const result = await write.run<BillDTO>(
      initialBill ? `/api/v1/shared-bills/${initialBill.id}/correct/` : "/api/v1/shared-bills/",
      initialBill ? { ...body, reason: data.reason } : body
    );
    if (result) {
      onSuccess?.(data);
      onOpenChange(false);
    }
  };
  const activeContacts = contacts.data?.filter((c) => !c.archived) ?? [];
  const activeCategories =
    categories.data?.filter(
      (c) =>
        !c.archived && (!c.parent || !categories.data?.find((p) => p.id === c.parent)?.archived)
    ) ?? [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <Users className="size-5 text-kivo-primary" />
            {initialBill ? "Correct Shared Bill" : "Create Shared Bill"}
          </DialogTitle>
          <DialogDescription>
            Your personal expense is your share of the bill. Other participants may owe you, or you
            may owe the person who paid.
          </DialogDescription>
        </DialogHeader>
        <FinancialWriteStatus write={write} onConfirmed={() => onOpenChange(false)} />
        <QueryState query={contacts} />
        <QueryState query={accounts} />
        <QueryState query={categories} />
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <fieldset disabled={write.busy || write.pending} className="space-y-4 min-w-0 text-xs">
            {initialBill && (
              <div>
                <Label htmlFor="bill-reason">Audit Reason</Label>
                <Input id="bill-reason" {...register("reason")} />
                {errors.reason && <FieldError message={errors.reason.message} />}
              </div>
            )}
            <div>
              <Label htmlFor="bill-title">Bill Title</Label>
              <Input id="bill-title" {...register("title")} />
              {errors.title && <FieldError message={errors.title.message} />}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="bill-amount">Total Bill Amount (₹)</Label>
                <Input id="bill-amount" inputMode="decimal" {...register("amount")} />
                {errors.amount && <FieldError message={errors.amount.message} />}
              </div>
              <div>
                <Label htmlFor="bill-date">Effective Date</Label>
                <Input id="bill-date" type="date" {...register("effectiveDate")} />
                {errors.effectiveDate && <FieldError message={errors.effectiveDate.message} />}
              </div>
            </div>
            <div>
              <Label htmlFor="bill-category">Category</Label>
              <select
                id="bill-category"
                {...register("category")}
                className="w-full rounded-md border bg-card p-2"
              >
                <option value="">Choose a category</option>
                {activeCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.category && <FieldError message={errors.category.message} />}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="bill-payer-type">Who Paid?</Label>
                <select
                  id="bill-payer-type"
                  {...register("payerType")}
                  disabled={!!initialBill}
                  className="w-full rounded-md border bg-card p-2"
                >
                  <option value="user">I paid</option>
                  <option value="friend">A friend paid</option>
                </select>
              </div>
              {payerType === "user" ? (
                <div>
                  <Label htmlFor="bill-account">Payment Account</Label>
                  <select
                    id="bill-account"
                    {...register("accountId")}
                    className="w-full rounded-md border bg-card p-2"
                  >
                    <option value="">Choose account</option>
                    {accounts.data
                      ?.filter((a) => !a.archived)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                  </select>
                  {errors.accountId && <FieldError message={errors.accountId.message} />}
                </div>
              ) : (
                <div>
                  <Label htmlFor="bill-payer">Friend Who Paid</Label>
                  <select
                    id="bill-payer"
                    {...register("payerContactId")}
                    className="w-full rounded-md border bg-card p-2"
                  >
                    <option value="">Choose a participant</option>
                    {activeContacts
                      .filter((c) => selected.includes(c.id))
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.display_name}
                        </option>
                      ))}
                  </select>
                  {errors.payerContactId && <FieldError message={errors.payerContactId.message} />}
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="bill-method">Split Method</Label>
              <select
                id="bill-method"
                {...register("splitMethod")}
                className="w-full rounded-md border bg-card p-2"
              >
                <option value="equal">Equal split</option>
                <option value="custom">Custom amounts</option>
              </select>
            </div>
            <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
              <p className="font-semibold">Participants</p>
              <p>You are included exactly once. Contacts do not need Kivo accounts.</p>
              {method === "custom" && (
                <div>
                  <Label htmlFor="bill-owner-share">Your Custom Share (₹)</Label>
                  <Input
                    id="bill-owner-share"
                    inputMode="decimal"
                    {...register("customShares.user")}
                  />
                </div>
              )}
              <div className="max-h-48 overflow-y-auto space-y-3">
                {activeContacts.map((c) => (
                  <div key={c.id} className="space-y-1">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" value={c.id} {...register("selectedParticipants")} />
                      {c.display_name}
                    </label>
                    {method === "custom" && selected.includes(c.id) && (
                      <div>
                        <Label htmlFor={`share-${c.id}`}>
                          Custom share for {c.display_name} (₹)
                        </Label>
                        <Input
                          id={`share-${c.id}`}
                          inputMode="decimal"
                          {...register(`customShares.${c.id}`)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {errors.selectedParticipants && (
                <FieldError message={errors.selectedParticipants.message} />
              )}
              {typeof errors.customShares?.message === "string" && (
                <FieldError message={errors.customShares.message} />
              )}
            </div>
            <div className="rounded-lg border border-kivo-sage/50 bg-kivo-sage/10 p-3 flex gap-2">
              <Info className="size-4 shrink-0 text-kivo-primary" />
              <p>
                Equal splits divide the bill fairly, including any remaining paisa. For custom
                splits, shares must add up to the bill total. If a friend pays, your cash changes
                only when you settle up.
              </p>
            </div>
            <div>
              <Label htmlFor="bill-merchant">Merchant (optional)</Label>
              <Input id="bill-merchant" {...register("merchant")} />
              {errors.merchant && <FieldError message={errors.merchant.message} />}
            </div>
            <div>
              <Label htmlFor="bill-notes">Notes (optional)</Label>
              <Input id="bill-notes" {...register("notes")} />
              {errors.notes && <FieldError message={errors.notes.message} />}
            </div>
            <div className="flex justify-end gap-2 border-t pt-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {write.busy
                  ? "Confirming…"
                  : initialBill
                    ? "Save Bill Correction"
                    : "Create Shared Bill"}
              </Button>
            </div>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
