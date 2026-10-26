"use client";
import * as React from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryState } from "@/features/finance/QueryState";
import { useContacts } from "@/features/relationships/queries";
import { useRentPlans, useRentObligations, useRentReserves, useCapacity } from "../queries";
import { planEntity, obligationEntity, reserveEntity, capacityEntity } from "../api";
import type { RentReserveEntity } from "../types";
import { SafeToSpendCard } from "./SafeToSpendCard";
import { RentOverviewCard } from "./RentOverviewCard";
import { RentObligationList } from "./RentObligationList";
import { RentReserveCard } from "./RentReserveCard";
import { RentPlanConfigModal } from "./RentPlanConfigModal";
import { RentReserveModal } from "./RentReserveModal";
import { ObligationActionModal } from "./ObligationActionModal";
import { RentPaymentModal } from "./RentPaymentModal";
import { RentObligationDetails, RentReserveHistory } from "./RentDetails";
import { rentSelectClass } from "./RentField";

export function LiveRent() {
  const plans = useRentPlans(),
    obligations = useRentObligations(),
    reserves = useRentReserves(),
    capacity = useCapacity(),
    contacts = useContacts();
  const [selected, setSelected] = React.useState("");
  const [planModal, setPlanModal] = React.useState<"create" | "edit" | null>(null),
    [pay, setPay] = React.useState<string | null>(null);
  const [reserveModal, setReserveModal] = React.useState<RentReserveEntity | "create" | null>(null),
    [reserveHistory, setReserveHistory] = React.useState<RentReserveEntity | null>(null);
  const [details, setDetails] = React.useState<string | null>(null),
    [action, setAction] = React.useState<{ id: string; kind: "skip" | "reopen" } | null>(null);
  const plan =
    plans.data?.find((p) => p.id === selected) ??
    plans.data?.find((p) => p.active) ??
    plans.data?.[0];
  const planDisplay = plan && contacts.data ? planEntity(plan, contacts.data) : undefined;
  const rows =
    obligations.data
      ?.filter((o) => o.plan === plan?.id)
      .map(obligationEntity)
      .sort((a, b) => a.month.localeCompare(b.month)) ?? [];
  const current = rows.find((o) => o.status !== "paid" && o.status !== "skipped") ?? rows.at(-1);
  const paying = obligations.data?.find((o) => o.id === pay),
    acting = obligations.data?.find((o) => o.id === action?.id);
  const reserveRows =
    reserves.data && obligations.data
      ? reserves.data.map((r) => reserveEntity(r, obligations.data))
      : [];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold">Monthly Rent & Reserves</h1>
          <p className="text-sm text-muted-foreground">
            Manage monthly dues and protected rent funds. Kivo records payments you make; it never
            initiates bank transfers.
          </p>
        </div>
        <Button onClick={() => setPlanModal("create")}>Create Rent Plan</Button>
      </div>
      <div className="min-h-80">
        <QueryState
          query={capacity}
          loading={
            <>
              <span className="sr-only">Loading available funds…</span>
              <Skeleton className="h-80 rounded-xl" />
            </>
          }
        />
        {capacity.isSuccess && (
          <div data-testid="rent-capacity">
            <SafeToSpendCard
              capacity={capacityEntity(capacity.data)}
              onAddReserve={() => setReserveModal("create")}
            />
          </div>
        )}
      </div>
      <div className="min-h-80">
        {[plans, obligations, contacts].some((query) => query.isPending) && (
          <Skeleton className="h-80 rounded-xl" aria-label="Loading rent details" />
        )}
        <QueryState query={plans} loading={<span className="sr-only">Loading rent plans…</span>} />
        <QueryState
          query={obligations}
          loading={<span className="sr-only">Loading rent obligations…</span>}
        />
        <QueryState query={contacts} loading={<span className="sr-only">Loading contacts…</span>} />
        {plans.isSuccess && !plans.data.length && (
          <div className="rounded-xl border border-dashed bg-card p-6 text-center text-sm">
            No rent plans yet. Create a plan, then generate monthly obligations.
          </div>
        )}
        {plans.isSuccess && plans.data.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="rent-plan-select">Rent Plan</Label>
            <select
              id="rent-plan-select"
              className={rentSelectClass}
              value={plan?.id ?? ""}
              onChange={(e) => setSelected(e.target.value)}
            >
              {plans.data.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                  {p.active ? "" : " (Inactive)"}
                </option>
              ))}
            </select>
          </div>
        )}
        {planDisplay && plans.isSuccess && contacts.isSuccess && obligations.isSuccess && (
          <RentOverviewCard
            key={planDisplay.id}
            plan={planDisplay}
            currentObligation={current}
            onConfigurePlan={() => setPlanModal("edit")}
            onRecordPayment={(o) => setPay(o.id)}
            onSkipObligation={(o) => setAction({ id: o.id, kind: "skip" })}
          />
        )}
      </div>
      <section className="space-y-3">
        <div className="flex gap-3 justify-between items-center flex-wrap">
          <h2 className="font-heading font-semibold flex items-center gap-2">
            <ShieldCheck className="size-4 text-amber-700" />
            Rent Reserve Earmarks
          </h2>
          <Button variant="outline" size="sm" onClick={() => setReserveModal("create")}>
            New Reserve
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Reserves cover unpaid landlord rent or protected friend payables. A paid landlord
          obligation does not automatically release a friend-paid reserve.
        </p>
        <QueryState query={reserves} />
        {reserves.isSuccess && obligations.isSuccess && !reserveRows.length && (
          <p className="rounded-xl border border-dashed p-5 text-xs text-muted-foreground">
            No rent reserves recorded.
          </p>
        )}
        {reserves.isSuccess &&
          obligations.isSuccess &&
          reserveRows.map((r) => (
            <div key={r.id} className="space-y-1">
              <RentReserveCard reserve={r} onAdjust={setReserveModal} />
              <Button variant="ghost" size="sm" onClick={() => setReserveHistory(r)}>
                View reserve history
              </Button>
            </div>
          ))}
      </section>
      {obligations.isSuccess && (
        <>
          <p className="text-xs text-muted-foreground">
            Statuses below describe landlord obligations. Outstanding friend payables remain
            separate. Filter the obligations for your selected plan.
          </p>
          <RentObligationList
            obligations={rows}
            onRecordPayment={(o) => setPay(o.id)}
            onSkip={(o) => setAction({ id: o.id, kind: "skip" })}
            onReopen={(o) => setAction({ id: o.id, kind: "reopen" })}
            onDetails={(o) => setDetails(o.id)}
          />
        </>
      )}
      {planModal && (
        <RentPlanConfigModal
          key={planModal + (plan?.id ?? "")}
          open
          onOpenChange={(v) => {
            if (!v) setPlanModal(null);
          }}
          plan={planModal === "edit" ? planDisplay : undefined}
        />
      )}
      {reserveModal && (
        <RentReserveModal
          open
          onOpenChange={(v) => {
            if (!v) setReserveModal(null);
          }}
          reserve={reserveModal === "create" ? undefined : reserveModal}
          obligations={(obligations.data ?? [])
            .filter(
              (o) => o.status !== "skipped" && (o.status !== "paid" || o.friend_payable !== "0.00")
            )
            .map(obligationEntity)}
        />
      )}
      {paying && (
        <RentPaymentModal
          key={paying.id}
          open
          onOpenChange={(v) => {
            if (!v) setPay(null);
          }}
          obligation={obligationEntity(paying)}
        />
      )}
      {acting && action && (
        <ObligationActionModal
          key={acting.id + action.kind}
          open
          onOpenChange={(v) => {
            if (!v) setAction(null);
          }}
          obligation={obligationEntity(acting)}
          action={action.kind}
        />
      )}
      {details && (
        <RentObligationDetails key={details} id={details} onClose={() => setDetails(null)} />
      )}
      {reserveHistory && (
        <RentReserveHistory reserve={reserveHistory} onClose={() => setReserveHistory(null)} />
      )}
    </div>
  );
}
