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
import { FieldError } from "@/features/auth/components/FieldError";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { decimalPaise, type EventDTO } from "@/features/finance/api";
import { QueryState } from "@/features/finance/QueryState";
import {
  useFinancialWrite,
  usePendingFinancialWrite,
  FinancialWriteStatus,
} from "@/features/finance/useFinancialWrite";
import { useOwnedList, useOwnedQuery } from "@/features/finance/useOwnedQuery";
import { useClaims, useContacts, useBills } from "@/features/relationships/queries";
import { ClaimPanel } from "@/features/relationships/components/LivePeople";
import { RelationshipHistory } from "@/features/relationships/components/RelationshipHistory";
import { RepaymentModal } from "@/features/lending/components/RepaymentModal";
import { useRentPayments } from "../queries";
import {
  obligationEntity,
  type ObligationDTO,
  type PaymentDTO,
  type ObligationHistoryDTO,
  type ReserveHistoryDTO,
} from "../api";
import type { RentObligationEntity, RentReserveEntity } from "../types";
import { RentPaymentModal } from "./RentPaymentModal";
import { RentStatusBadge } from "./RentStatusBadge";
const reasonSchema = z.object({ reason: z.string().trim().min(5).max(500) });

function RentPaymentActions({
  payment,
  obligation,
}: {
  payment: PaymentDTO;
  obligation: RentObligationEntity;
}) {
  const [edit, setEdit] = React.useState(false),
    [reverse, setReverse] = React.useState(false);
  const write = useFinancialWrite("rent-payment:" + payment.id + ":reverse", true);
  const correcting = usePendingFinancialWrite("rent-payment:" + payment.id + ":correct");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ reason: string }>({
    resolver: zodResolver(reasonSchema),
    defaultValues: { reason: "" },
  });
  const posted = payment.event.status === "posted";
  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        size="sm"
        variant="outline"
        disabled={!posted && !correcting}
        onClick={() => setEdit(true)}
      >
        {correcting ? "Resolve pending correction" : "Correct Rent Payment"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={!posted && !write.pending}
        onClick={() => setReverse(true)}
      >
        {write.pending ? "Resolve pending reversal" : "Reverse Rent Payment"}
      </Button>
      {edit && (
        <RentPaymentModal
          open
          onOpenChange={setEdit}
          obligation={obligation}
          initialPayment={payment}
        />
      )}
      <Dialog open={reverse} onOpenChange={setReverse}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Audited Rent Payment Reversal</DialogTitle>
            <DialogDescription>
              A reversal preserves history and restores applicable obligation, claim and reserve
              effects. Dependent settlements may need reversal first.
            </DialogDescription>
          </DialogHeader>
          <FinancialWriteStatus write={write} onConfirmed={() => setReverse(false)} />
          <form
            onSubmit={handleSubmit(async (body) => {
              if (
                await write.run<EventDTO>("/api/v1/rent/payments/" + payment.id + "/reverse/", body)
              )
                setReverse(false);
            })}
          >
            <fieldset disabled={write.busy || write.pending} className="space-y-3">
              <Label htmlFor="rent-reverse-reason">Audit Reason</Label>
              <Input id="rent-reverse-reason" {...register("reason")} />
              {errors.reason && <FieldError message={errors.reason.message} />}
              <Button type="submit">Confirm Rent Reversal</Button>
            </fieldset>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function RentObligationDetails({ id, onClose }: { id: string; onClose: () => void }) {
  const obligation = useOwnedQuery<ObligationDTO>(
    "rent-obligations",
    "/api/v1/rent/obligations/" + id + "/"
  );
  const payments = useRentPayments(id),
    contacts = useContacts(),
    claims = useClaims(),
    bills = useBills();
  const history = useOwnedList<ObligationHistoryDTO>(
    "rent-obligations",
    "/api/v1/rent/obligations/" + id + "/history/"
  );
  const pendingPayment = usePendingFinancialWrite("rent-payment:" + id + ":create");
  const [pay, setPay] = React.useState(false),
    [repay, setRepay] = React.useState<string | null>(null);
  const sourceIds = new Set(payments.data?.map((p) => p.event.id) ?? []);
  const related = claims.data?.filter((c) => sourceIds.has(c.source_event)) ?? [];
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="sm:max-w-3xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rent Obligation Details & History</DialogTitle>
          <DialogDescription>
            Landlord payment status and your friend payables are separate. All figures and audit
            records below reflect confirmed postings.
          </DialogDescription>
        </DialogHeader>
        <QueryState query={obligation} />
        <QueryState query={payments} />
        <QueryState query={contacts} />
        <QueryState query={claims} />
        <QueryState query={bills} />
        <QueryState query={history} />
        {obligation.isSuccess && (
          <>
            <div
              className="rounded-xl border bg-muted/20 p-4 text-xs space-y-2"
              data-testid="rent-obligation-details"
            >
              <p className="font-semibold">
                {obligation.data.month.substring(0, 7)} • Due {obligation.data.due_date}
              </p>
              <RentStatusBadge status={obligation.data.status} />
              <p>
                Gross landlord rent:{" "}
                <MoneyAmount paise={decimalPaise(obligation.data.amount)} size="sm" />
              </p>
              <p>
                Paid to landlord:{" "}
                <MoneyAmount paise={decimalPaise(obligation.data.paid)} size="sm" />
              </p>
              <p>
                Outstanding to landlord:{" "}
                <MoneyAmount paise={decimalPaise(obligation.data.outstanding)} size="sm" />
              </p>
              <p>
                Outstanding friend payable:{" "}
                <MoneyAmount paise={decimalPaise(obligation.data.friend_payable)} size="sm" />
              </p>
              <Button
                size="sm"
                disabled={
                  !pendingPayment &&
                  (obligation.data.status === "paid" || obligation.data.status === "skipped")
                }
                onClick={() => setPay(true)}
              >
                {pendingPayment ? "Resolve pending rent payment" : "Record Rent Payment"}
              </Button>
            </div>
            <h3 className="font-heading font-semibold">Confirmed Payments & Revisions</h3>
            {payments.isSuccess && !payments.data.length && (
              <p className="text-xs text-muted-foreground">No rent payments recorded.</p>
            )}
            {payments.data?.map((payment) => {
              const bill = bills.data?.find((b) => b.event.id === payment.event.id);
              return (
                <div
                  key={payment.id}
                  data-testid={"rent-payment-" + payment.id}
                  className="rounded-xl border p-3 space-y-3"
                >
                  <RentPaymentActions
                    payment={payment}
                    obligation={obligationEntity(obligation.data)}
                  />
                  {bill && (
                    <Link
                      prefetch={false}
                      className="text-xs text-kivo-primary"
                      href={"/shared-expenses/" + bill.id}
                    >
                      View server-recognized participant shares →
                    </Link>
                  )}
                  <RelationshipHistory events={[payment.event]} title="Rent Payment Journal" />
                </div>
              );
            })}
            {payments.isSuccess && contacts.isSuccess && claims.isSuccess && (
              <ClaimPanel
                claims={related}
                contacts={contacts.data}
                events={payments.data.map((p) => p.event)}
                onSettle={setRepay}
              />
            )}
            <h3 className="font-heading font-semibold">Obligation Status Audit</h3>
            {history.isSuccess && !history.data.length && (
              <p className="text-xs text-muted-foreground">No status changes recorded.</p>
            )}
            {history.data?.map((h) => (
              <p key={h.id} className="text-xs rounded-lg border p-3">
                {h.action} • {h.reason} • {h.created_at}
              </p>
            ))}
            {pay && (
              <RentPaymentModal
                open
                onOpenChange={setPay}
                obligation={obligationEntity(obligation.data)}
              />
            )}
            {repay && (
              <RepaymentModal
                key={repay}
                open
                defaultClaimId={repay}
                onOpenChange={(v) => {
                  if (!v) setRepay(null);
                }}
              />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function RentReserveHistory({
  reserve,
  onClose,
}: {
  reserve: RentReserveEntity;
  onClose: () => void;
}) {
  const query = useOwnedList<ReserveHistoryDTO>(
    "rent-reserves",
    "/api/v1/rent/reserves/" + reserve.id + "/history/"
  );
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rent Reserve History</DialogTitle>
          <DialogDescription>
            Active and deactivated audit changes for {reserve.label}, including assignments to
            friend payables and releases after settlement.
          </DialogDescription>
        </DialogHeader>
        <QueryState query={query} />
        {query.data?.map((h) => (
          <div key={h.id} className="border rounded-lg p-3 text-xs space-y-1 break-words">
            <p>
              {h.reason} • {h.active ? "Active change" : "Deactivated by reversal"}
            </p>
            <MoneyAmount paise={decimalPaise(h.delta)} size="sm" />
            <p>{h.created_at}</p>
            {h.claim && <p className="break-all">Claim {h.claim}</p>}
            {h.payment && <p className="break-all">Rent payment {h.payment}</p>}
            {h.settlement && (
              <Link prefetch={false} href={"/transactions/" + h.settlement}>
                Settlement journal →
              </Link>
            )}
          </div>
        ))}
      </DialogContent>
    </Dialog>
  );
}
