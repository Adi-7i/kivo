"use client";
import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
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
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FieldError } from "@/features/auth/components/FieldError";
import {
  FinancialWriteStatus,
  useFinancialWrite,
  usePendingFinancialWrite,
} from "@/features/finance/useFinancialWrite";
import { QueryState } from "@/features/finance/QueryState";
import { useOwnedList } from "@/features/finance/useOwnedQuery";
import { decimalPaise, type EventDTO } from "@/features/finance/api";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { TransactionTypeBadge } from "@/features/shared-financial/TransactionTypeBadge";
import { LendBorrowModal } from "@/features/lending/components/LendBorrowModal";
import { RepaymentModal } from "@/features/lending/components/RepaymentModal";
import { CreateSharedBillModal } from "@/features/shared-expenses/components/CreateSharedBillModal";
import type { BillDTO } from "../api";
const reversalSchema = z.object({
  reason: z.string().trim().min(5, "Provide an audit reason of at least 5 characters").max(500),
});

export function RelationshipActions({ event, bill }: { event: EventDTO; bill?: BillDTO }) {
  const domain = bill
    ? "shared-bills"
    : ["lend", "borrow"].includes(event.kind)
      ? "loans"
      : ["repay_in", "repay_out"].includes(event.kind)
        ? "settlements"
        : null;
  const resource = bill?.id ?? event.id;
  const slot = bill
    ? `bill:${resource}:correct`
    : domain === "loans"
      ? `loan:${resource}:correct`
      : `settlement:${resource}:correct`;
  const correcting = usePendingFinancialWrite(slot);
  const write = useFinancialWrite(`${domain ?? "unsupported"}:${resource}:reverse`, true);
  const [reverse, setReverse] = React.useState(false),
    [edit, setEdit] = React.useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof reversalSchema>>({
    resolver: zodResolver(reversalSchema),
    defaultValues: { reason: "" },
  });
  if (!domain) return null;
  const posted = event.status === "posted";
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={!posted && !correcting}
        onClick={() => setEdit(true)}
      >
        {correcting ? "Resolve pending correction" : "Correct"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={!posted && !write.pending}
        onClick={() => setReverse(true)}
      >
        {write.pending ? "Resolve pending reversal" : "Reverse"}
      </Button>
      {edit &&
        (bill ? (
          <CreateSharedBillModal open={edit} onOpenChange={setEdit} initialBill={bill} />
        ) : domain === "loans" ? (
          <LendBorrowModal open={edit} onOpenChange={setEdit} initialEvent={event} />
        ) : (
          <RepaymentModal open={edit} onOpenChange={setEdit} initialEvent={event} />
        ))}
      <Dialog open={reverse} onOpenChange={setReverse}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Audited Reversal</DialogTitle>
            <DialogDescription>
              Append an opposite event; never delete or overwrite history. Dependent settlements may
              need reversal first.
            </DialogDescription>
          </DialogHeader>
          <FinancialWriteStatus write={write} onConfirmed={() => setReverse(false)} />
          <form
            onSubmit={handleSubmit(async (data) => {
              const result = await write.run<EventDTO>(
                `/api/v1/${domain}/${resource}/reverse/`,
                data
              );
              if (result) setReverse(false);
            })}
          >
            <fieldset disabled={write.pending || write.busy} className="space-y-3 min-w-0">
              <Label htmlFor="reverse-reason">Audit Reason</Label>
              <Input id="reverse-reason" {...register("reason")} />
              {errors.reason && <FieldError message={errors.reason.message} />}
              <Button type="submit">Confirm Reversal</Button>
            </fieldset>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export function RelationshipHistory({
  events,
  title = "Financial History",
}: {
  events: EventDTO[];
  title?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!events.length && (
          <p className="text-xs text-muted-foreground">No financial events recorded.</p>
        )}
        {events.map((event) => (
          <div
            key={event.id}
            data-testid={`event-${event.id}`}
            className="rounded-lg border p-3 space-y-2 text-xs"
          >
            <div className="flex flex-wrap justify-between gap-2">
              <TransactionTypeBadge kind={event.kind} />
              <span>{event.status}</span>
            </div>
            <Link
              prefetch={false}
              href={`/transactions/${event.id}`}
              className="font-semibold break-words"
            >
              {event.title}
            </Link>
            <p>
              {event.effective_date} • Face amount:{" "}
              <MoneyAmount paise={decimalPaise(event.amount)} size="sm" />
            </p>
            <p className="text-muted-foreground">
              Financial effects below, not face amount, determine personal expense and claims.
            </p>
            {event.financial_effects.map((leg, index) => (
              <p key={index} className="break-all">
                {leg.book} • <MoneyAmount paise={decimalPaise(leg.amount)} size="xs" />{" "}
                {leg.claim ? `• Claim ${leg.claim}` : ""}
              </p>
            ))}
            {event.reason && <p>Audit reason: {event.reason}</p>}
            {event.supersedes && (
              <p>
                <Link prefetch={false} href={`/transactions/${event.supersedes}`}>
                  Supersedes original event →
                </Link>
              </p>
            )}
            {event.reversed_by && (
              <p>
                <Link prefetch={false} href={`/transactions/${event.reversed_by}`}>
                  Reversal event →
                </Link>
              </p>
            )}
            <RelationshipActions event={event} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
export function ClaimHistory({
  id,
  open,
  onOpenChange,
}: {
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const query = useOwnedList<EventDTO>("claims", `/api/v1/claims/${id}/history/`, {}, open);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Claim History</DialogTitle>
          <DialogDescription>Actual journal events linked to this owned claim.</DialogDescription>
        </DialogHeader>
        <QueryState query={query} />
        {query.isSuccess && <RelationshipHistory events={query.data} />}
      </DialogContent>
    </Dialog>
  );
}
