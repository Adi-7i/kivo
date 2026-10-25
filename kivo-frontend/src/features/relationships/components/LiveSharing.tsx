"use client";
import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useOwnedQuery } from "@/features/finance/useOwnedQuery";
import { QueryState } from "@/features/finance/QueryState";
import { useCategories } from "@/features/finance/queries";
import { useBills, useContacts, useClaims } from "../queries";
import { billEntity, type BillDTO } from "../api";
import { SharedBillList } from "@/features/shared-expenses/components/SharedBillList";
import { SharedBillDetailHeader } from "@/features/shared-expenses/components/SharedBillDetailHeader";
import { CreateSharedBillModal } from "@/features/shared-expenses/components/CreateSharedBillModal";
import { RepaymentModal } from "@/features/lending/components/RepaymentModal";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { decimalPaise } from "@/features/finance/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RelationshipTotals, ClaimPanel } from "./LivePeople";
import { RelationshipActions, RelationshipHistory } from "./RelationshipHistory";

export function LiveSharedExpenses() {
  const bills = useBills(),
    contacts = useContacts(),
    claims = useClaims(),
    categories = useCategories();
  const [open, setOpen] = React.useState(false);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold">Shared Expenses & Bills</h1>
          <p className="text-sm text-muted-foreground">
            Gross bill is not necessarily personal expense. Repayments reduce existing claims, never
            fresh income or duplicate expense.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>Create Shared Bill</Button>
      </div>
      <RelationshipTotals />
      <p className="text-xs text-muted-foreground">
        Summary amounts above cover all modules, not just sharing. A sharing-only aggregate API is
        not available; no cumulative bill amounts are calculated here.
      </p>
      <QueryState query={bills} />
      <QueryState query={contacts} />
      <QueryState query={claims} />
      <QueryState query={categories} />
      {bills.isSuccess && contacts.isSuccess && claims.isSuccess && categories.isSuccess && (
        <>
          <p className="text-xs">
            {bills.data.length} bill records including immutable revisions. Search/sorting apply to
            all downloaded owned records.
          </p>
          <SharedBillList
            bills={bills.data.map((b) =>
              billEntity(b, contacts.data, claims.data, categories.data)
            )}
            onCreateBill={() => setOpen(true)}
          />
        </>
      )}
      {open && <CreateSharedBillModal open={open} onOpenChange={setOpen} />}
    </div>
  );
}

export function LiveSharedDetail() {
  const { id } = useParams<{ id: string }>();
  const query = useOwnedQuery<BillDTO>("shared-bills", `/api/v1/shared-bills/${id}/`),
    bills = useBills(),
    contacts = useContacts(),
    claims = useClaims(),
    categories = useCategories();
  const [settle, setSettle] = React.useState<string | null>(null);
  const related = claims.data?.filter((c) => c.source_event === query.data?.event.id) ?? [];
  const ready = query.isSuccess && contacts.isSuccess && claims.isSuccess && categories.isSuccess;
  return (
    <div className="space-y-6">
      <Link prefetch={false} href="/shared-expenses" className="text-xs text-kivo-primary">
        ← Back to Shared Expenses
      </Link>
      <QueryState query={query} />
      <QueryState query={contacts} />
      <QueryState query={claims} />
      <QueryState query={categories} />
      <QueryState query={bills} />
      {ready && (
        <>
          <SharedBillDetailHeader
            bill={billEntity(query.data, contacts.data, claims.data, categories.data)}
          />
          <RelationshipActions event={query.data.event} bill={query.data} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Participant Shares Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {query.data.shares.map((share, index) => {
                  const claim = claims.data.find((c) => c.id === share.claim);
                  return (
                    <div
                      key={share.contact ?? `owner-${index}`}
                      className="rounded-lg border p-3 text-xs space-y-1"
                      data-testid={share.contact ? `share-${share.contact}` : "share-owner"}
                    >
                      <p className="font-semibold">
                        {share.contact
                          ? (contacts.data.find((c) => c.id === share.contact)?.display_name ??
                            share.contact)
                          : "You"}{" "}
                        {share.contact === query.data.payer ? "• Payer" : ""}
                      </p>
                      <p>
                        Original share: <MoneyAmount paise={decimalPaise(share.amount)} size="sm" />
                      </p>
                      {claim ? (
                        <>
                          <p>
                            {claim.direction} • {claim.status}
                          </p>
                          <p>
                            Outstanding:{" "}
                            <MoneyAmount paise={decimalPaise(claim.outstanding)} size="sm" />
                          </p>
                          {(claim.status === "open" || claim.status === "partial") && (
                            <Button size="sm" variant="outline" onClick={() => setSettle(claim.id)}>
                              Record Settlement
                            </Button>
                          )}
                        </>
                      ) : (
                        <p className="text-muted-foreground">
                          {share.claim
                            ? "Claim is being refreshed"
                            : "No claim is assigned to this share"}
                        </p>
                      )}
                    </div>
                  );
                })}
                <p className="text-xs text-muted-foreground">
                  Friend-paid bills recognize your expense/payable without cash movement. Other
                  friends&apos; shares are metadata, not your assets.
                </p>
              </CardContent>
            </Card>
            <ClaimPanel
              claims={related}
              contacts={contacts.data}
              events={[query.data.event]}
              onSettle={setSettle}
            />
          </div>
          <RelationshipHistory events={[query.data.event]} title="Immutable Bill Event" />
          <div className="text-xs space-y-2">
            {query.data.event.supersedes && (
              <p>
                <Link prefetch={false} href={`/transactions/${query.data.event.supersedes}`}>
                  Prior original bill event →
                </Link>
              </p>
            )}
            {bills.data
              ?.filter((b) => b.event.supersedes === query.data.event.id)
              .map((b) => (
                <p key={b.id}>
                  <Link prefetch={false} href={`/shared-expenses/${b.id}`}>
                    Replacement bill revision →
                  </Link>
                </p>
              ))}
          </div>
          {settle !== null && (
            <RepaymentModal
              key={settle}
              open={settle !== null}
              onOpenChange={(v) => {
                if (!v) setSettle(null);
              }}
              defaultClaimId={settle}
            />
          )}
        </>
      )}
    </div>
  );
}
