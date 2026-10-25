"use client";
import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useOwnedList, useOwnedQuery } from "@/features/finance/useOwnedQuery";
import { QueryState } from "@/features/finance/QueryState";
import { decimalPaise, type EventDTO } from "@/features/finance/api";
import type { DashboardDTO } from "@/features/dashboard/api";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ContactList } from "@/features/people/components/ContactList";
import { ContactModal } from "@/features/people/components/ContactModal";
import { ContactDetailHeader } from "@/features/people/components/ContactDetailHeader";
import { LendBorrowModal } from "@/features/lending/components/LendBorrowModal";
import { RepaymentModal } from "@/features/lending/components/RepaymentModal";
import { ClaimCard } from "@/features/lending/components/ClaimCard";
import { useContacts, useClaims, useLoans, useSettlements } from "../queries";
import { contactEntity, claimEntity, type ContactDTO, type ClaimDTO } from "../api";
import { RelationshipHistory, ClaimHistory } from "./RelationshipHistory";

export function RelationshipTotals() {
  const dashboard = useOwnedQuery<DashboardDTO>("dashboard", "/api/v1/dashboard/", {
    period: "month",
  });
  return (
    <>
      <QueryState query={dashboard} />
      {dashboard.isSuccess && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" data-testid="relationship-summary">
          {(
            [
              ["Receivables (all modules)", dashboard.data.receivables],
              ["Payables (all modules)", dashboard.data.payables],
              [
                "Monthly personal expense (all modules)",
                dashboard.data.selected_period.personal_expense,
              ],
            ] as const
          ).map(([label, amount]) => (
            <Card key={label}>
              <CardContent className="p-4 space-y-2">
                <p className="text-xs text-muted-foreground">{label}</p>
                <MoneyAmount paise={decimalPaise(amount)} size="xl" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

export function ClaimPanel({
  claims,
  contacts,
  events,
  onSettle,
}: {
  claims: ClaimDTO[];
  contacts: ContactDTO[];
  events: EventDTO[];
  onSettle: (id: string) => void;
}) {
  const [history, setHistory] = React.useState<string | null>(null);
  return (
    <div className="space-y-4">
      <h2 className="font-heading font-semibold">Financial Claims</h2>
      {!claims.length && <p className="text-xs text-muted-foreground">No claims recorded.</p>}
      {claims.map((c) => (
        <div key={c.id} className="space-y-1">
          <ClaimCard claim={claimEntity(c, contacts, events)} onSettle={() => onSettle(c.id)} />
          <Button size="sm" variant="ghost" onClick={() => setHistory(c.id)}>
            View claim history
          </Button>
        </div>
      ))}
      {history && (
        <ClaimHistory
          id={history}
          open={!!history}
          onOpenChange={(open) => {
            if (!open) setHistory(null);
          }}
        />
      )}
    </div>
  );
}

export function LivePeople() {
  const contacts = useContacts(),
    loans = useLoans(),
    settlements = useSettlements();
  const [contactOpen, setContactOpen] = React.useState(false),
    [loanOpen, setLoanOpen] = React.useState(false),
    [repayOpen, setRepayOpen] = React.useState(false);
  const [kind, setKind] = React.useState<"lend" | "borrow">("lend");
  const events = [...(loans.data ?? []), ...(settlements.data ?? [])].sort(
    (a, b) =>
      b.effective_date.localeCompare(a.effective_date) || b.created_at.localeCompare(a.created_at)
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold">Friends & Contacts</h1>
          <p className="text-sm text-muted-foreground">
            Personal records, not separate Kivo accounts. Claims are tracked individually and never
            automatically netted.
          </p>
        </div>
        <Button onClick={() => setContactOpen(true)}>Add Contact</Button>
      </div>
      <RelationshipTotals />
      <Card>
        <CardHeader>
          <CardTitle>Quick Operations</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              setKind("lend");
              setLoanOpen(true);
            }}
          >
            Lend
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setKind("borrow");
              setLoanOpen(true);
            }}
          >
            Borrow
          </Button>
          <Button variant="secondary" onClick={() => setRepayOpen(true)}>
            Record Repayment
          </Button>
        </CardContent>
      </Card>
      <QueryState query={contacts} />
      {contacts.isSuccess && (
        <>
          <p className="text-xs">
            {contacts.data.filter((c) => !c.archived).length} active contacts. Search and sorting
            apply to the full downloaded owned contact list.
          </p>
          <ContactList
            contacts={contacts.data.map(contactEntity)}
            onAddContact={() => setContactOpen(true)}
          />
        </>
      )}
      <QueryState query={loans} />
      <QueryState query={settlements} />
      {loans.isSuccess && settlements.isSuccess && (
        <RelationshipHistory events={events} title="Loans & Repayments" />
      )}
      {contactOpen && <ContactModal open={contactOpen} onOpenChange={setContactOpen} />}
      {loanOpen && (
        <LendBorrowModal key={kind} open={loanOpen} onOpenChange={setLoanOpen} defaultKind={kind} />
      )}
      {repayOpen && <RepaymentModal open={repayOpen} onOpenChange={setRepayOpen} />}
    </div>
  );
}

export function LiveContactDetail() {
  const { id } = useParams<{ id: string }>();
  const query = useOwnedQuery<ContactDTO>("contacts", `/api/v1/contacts/${id}/`),
    contacts = useContacts(),
    claims = useClaims();
  const history = useOwnedList<EventDTO>(
    "contacts",
    `/api/v1/contacts/${id}/history/`,
    {},
    query.isSuccess
  );
  const [edit, setEdit] = React.useState(false),
    [loan, setLoan] = React.useState<"lend" | "borrow" | null>(null),
    [repay, setRepay] = React.useState<string | null>(null);
  const related = (claims.data ?? []).filter((c) => c.contact === id);
  return (
    <div className="space-y-6">
      <Link prefetch={false} href="/people" className="text-xs text-kivo-primary">
        ← Back to Contacts
      </Link>
      <QueryState query={query} />
      <QueryState query={contacts} />
      <QueryState query={claims} />
      <QueryState query={history} />
      {query.isSuccess && (
        <>
          <ContactDetailHeader
            contact={contactEntity(query.data)}
            onEdit={() => setEdit(true)}
            onLend={query.data.archived ? undefined : () => setLoan("lend")}
            onBorrow={query.data.archived ? undefined : () => setLoan("borrow")}
            onRepay={() =>
              setRepay(related.find((c) => c.status === "open" || c.status === "partial")?.id ?? "")
            }
          />
          {claims.isFetching && claims.isSuccess && (
            <p role="status" className="text-xs">
              Refreshing authoritative claim balances…
            </p>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {claims.isSuccess && contacts.isSuccess && (
              <ClaimPanel
                claims={related}
                contacts={contacts.data}
                events={history.data ?? []}
                onSettle={setRepay}
              />
            )}
            {history.isSuccess && (
              <RelationshipHistory events={history.data} title="Contact Financial History" />
            )}
          </div>
          {edit && (
            <ContactModal
              key={id}
              open={edit}
              onOpenChange={setEdit}
              contact={contactEntity(query.data)}
            />
          )}
          {loan && (
            <LendBorrowModal
              key={loan}
              open={!!loan}
              onOpenChange={(v) => {
                if (!v) setLoan(null);
              }}
              defaultKind={loan}
              defaultContactId={id}
            />
          )}
          {repay !== null && (
            <RepaymentModal
              key={repay}
              open={repay !== null}
              onOpenChange={(v) => {
                if (!v) setRepay(null);
              }}
              defaultClaimId={repay}
            />
          )}
        </>
      )}
    </div>
  );
}
