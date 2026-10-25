"use client";
import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useOwnedQuery, useOwnedList } from "@/features/finance/useOwnedQuery";
import { QueryState } from "@/features/finance/QueryState";
import { useAccounts, useCategories, invalidateFinance } from "@/features/finance/queries";
import { decimalPaise } from "@/features/finance/api";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { TransactionPagination } from "@/features/transactions/components/TransactionPagination";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateDisplay } from "@/lib/formatters/date";
import {
  fundingName,
  fundingState,
  type FundSummaryDTO,
  type ReportBatchDTO,
  type FundingBatchDTO,
  type AllocationDTO,
  type FundBreakdownDTO,
} from "../api";

export function ServerMoney({ value }: { value: string | null | undefined }) {
  return value == null ? (
    <span className="text-xs text-muted-foreground">Not computed</span>
  ) : (
    <MoneyAmount paise={decimalPaise(value)} size="sm" tabular />
  );
}
function useSnapshot() {
  return useOwnedQuery<FundSummaryDTO>("funds", "/api/v1/funds/summary/");
}
function SnapshotStatus({ summary }: { summary: FundSummaryDTO }) {
  return (
    <div className="rounded-xl border border-kivo-sage/50 bg-kivo-sage/10 p-4 text-xs space-y-2">
      <p>
        FIFO is Django accounting attribution, not tracking physical currency. Remaining capacity
        includes recoverable receivables and is not an account cash balance.
      </p>
      <p>
        Attribution: <strong>{summary.attribution_status}</strong> • Policy:{" "}
        {summary.policy_version ?? "Not computed"}
      </p>
      {summary.run_id && <p className="break-all">Snapshot: {summary.run_id}</p>}
      {summary.attribution_status !== "complete" && (
        <p role="alert">
          Attribution is not complete. Do not infer balances, exhaustion or zero amounts from
          missing calculations.
        </p>
      )}
      {summary.gaps.map((gap, index) => (
        <p role="alert" key={index}>
          {gap.code} • {gap.account} • <ServerMoney value={gap.amount} />
        </p>
      ))}
    </div>
  );
}
function BatchCard({ batch, accountName }: { batch: FundingBatchDTO; accountName: string }) {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="break-words">{fundingName(batch)}</CardTitle>
          <span className="rounded-full border px-2 py-1 text-xs shrink-0">
            {fundingState(batch)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground break-words">
          {formatDateDisplay(batch.effective_date)} • {batch.source_type} • {accountName}
        </p>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted/40 p-3">
          <div>
            <p>Original funding</p>
            <ServerMoney value={batch.original_amount} />
          </div>
          <div>
            <p>Allocated capacity</p>
            <ServerMoney value={batch.allocated_amount} />
          </div>
          <div>
            <p>Remaining capacity</p>
            <ServerMoney value={batch.remaining_capacity} />
          </div>
        </div>
        {batch.exhausted_on && (
          <p>
            Exhausted {formatDateDisplay(batch.exhausted_on)} • {batch.elapsed_calendar_days}{" "}
            inclusive calendar days
          </p>
        )}
        <Link
          prefetch={false}
          href={`/money/sources/${batch.id}`}
          className="font-semibold text-kivo-primary"
        >
          View Fund Journey →
        </Link>
      </CardContent>
    </Card>
  );
}

export function LiveFundingSources() {
  const summary = useSnapshot();
  const run = summary.data?.run_id ?? undefined;
  const batches = useOwnedList<ReportBatchDTO>(
    "funds",
    "/api/v1/reports/funds/",
    { run },
    summary.isSuccess
  );
  const accounts = useAccounts();
  const client = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [state, setState] = React.useState("all");
  const [sort, setSort] = React.useState("newest");
  const [page, setPage] = React.useState(1);
  const filtered = (batches.data ?? [])
    .filter(
      (b) =>
        fundingName(b).toLocaleLowerCase().includes(search.toLocaleLowerCase()) &&
        (state === "all" || fundingState(b) === state)
    )
    .sort((a, b) => {
      if (sort === "highest") {
        const left = BigInt(a.original_amount.replace(".", "")),
          right = BigInt(b.original_amount.replace(".", ""));
        return left === right ? 0 : left > right ? -1 : 1;
      }
      return sort === "oldest"
        ? a.effective_date.localeCompare(b.effective_date)
        : b.effective_date.localeCompare(a.effective_date);
    });
  const change = (callback: () => void) => {
    callback();
    setPage(1);
  };
  return (
    <div className="space-y-6">
      <div className="flex gap-3 text-xs">
        <Link prefetch={false} href="/money">
          Money Accounts
        </Link>
        <span className="font-semibold text-kivo-primary">Money Sources & Journeys</span>
      </div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-heading">Money Sources & Fund Journey</h1>
          <p className="text-xs text-muted-foreground">
            Actual funding sources and immutable allocation snapshots.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void invalidateFinance(client)}>
          Refresh
        </Button>
      </div>
      <QueryState query={summary} />
      <QueryState query={batches} />
      <QueryState query={accounts} />
      {summary.isSuccess && (
        <>
          <SnapshotStatus summary={summary.data} />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {(
              [
                ["Original funding", summary.data.original_amount],
                ["Allocated capacity", summary.data.allocated_amount],
                ["Remaining capacity (not cash)", summary.data.remaining_capacity],
                ["Unfunded amount", summary.data.unfunded_amount],
              ] as const
            ).map(([label, value]) => (
              <Card key={label}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <ServerMoney value={value} />
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-xs">
            {summary.data.active_batches} active funding batches in this snapshot.
          </p>
        </>
      )}
      <div className="flex flex-wrap gap-3 rounded-xl border bg-card p-4 text-xs">
        <input
          aria-label="Search money sources"
          placeholder="Search source name…"
          className="min-w-0 flex-1 rounded-lg border p-2"
          value={search}
          onChange={(e) => change(() => setSearch(e.target.value))}
        />
        <select
          aria-label="Filter attribution state"
          value={state}
          onChange={(e) => change(() => setState(e.target.value))}
          className="rounded-lg border p-2"
        >
          {["all", "active", "exhausted", "inactive", "incomplete", "not_computed"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          aria-label="Sort money sources"
          value={sort}
          onChange={(e) => change(() => setSort(e.target.value))}
          className="rounded-lg border p-2"
        >
          <option value="newest">Newest inflow</option>
          <option value="oldest">Oldest inflow</option>
          <option value="highest">Highest amount</option>
        </select>
        <p className="w-full text-muted-foreground">
          Search, display sorting and page controls apply to all downloaded rows of the pinned
          snapshot; Django does not expose source-search filters.
        </p>
      </div>
      {summary.isSuccess && batches.isSuccess && accounts.isSuccess && (
        <>
          {!filtered.length ? (
            <Card>
              <CardContent className="p-8 text-center text-sm">
                No Funding Sources Found
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:hidden">
                {filtered.slice((page - 1) * 20, page * 20).map((batch) => (
                  <BatchCard
                    key={batch.id}
                    batch={batch}
                    accountName={
                      accounts.data.find((a) => a.id === batch.originating_account)?.name ??
                      batch.originating_account
                    }
                  />
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto rounded-xl border border-border bg-card shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="border-b bg-muted/40 text-muted-foreground">
                    <tr>
                      {[
                        "Funding Source",
                        "Date",
                        "Credited Account",
                        "Original Funding",
                        "Allocated Capacity",
                        "Remaining Capacity",
                        "Status",
                        "Journey",
                      ].map((label) => (
                        <th key={label} className="p-3" scope="col">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.slice((page - 1) * 20, page * 20).map((b) => (
                      <tr key={b.id} className="hover:bg-muted/30">
                        <td className="p-3 font-semibold">
                          <div>{fundingName(b)}</div>
                          <p className="font-normal text-muted-foreground">{b.source_type}</p>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {formatDateDisplay(b.effective_date)}
                        </td>
                        <td className="p-3">
                          {accounts.data.find((a) => a.id === b.originating_account)?.name ??
                            b.originating_account}
                        </td>
                        <td className="p-3">
                          <ServerMoney value={b.original_amount} />
                        </td>
                        <td className="p-3">
                          <ServerMoney value={b.allocated_amount} />
                        </td>
                        <td className="p-3">
                          <ServerMoney value={b.remaining_capacity} />
                        </td>
                        <td className="p-3">{fundingState(b)}</td>
                        <td className="p-3">
                          <Link
                            prefetch={false}
                            href={`/money/sources/${b.id}`}
                            className="text-kivo-primary"
                          >
                            View Journey →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TransactionPagination
                itemLabel="funding batches"
                currentPage={page}
                totalPages={Math.ceil(filtered.length / 20)}
                totalItems={filtered.length}
                pageSize={20}
                onPageChange={setPage}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

export function LiveFundDetail() {
  const { id } = useParams<{ id: string }>();
  const summary = useSnapshot();
  const run = summary.data?.run_id ?? undefined;
  const batch = useOwnedQuery<FundingBatchDTO>(
    "funds",
    `/api/v1/funds/batches/${id}/`,
    { run },
    summary.isSuccess
  );
  const journey = useOwnedList<AllocationDTO>(
    "funds",
    `/api/v1/funds/batches/${id}/journey/`,
    { run },
    batch.isSuccess
  );
  const breakdown = useOwnedList<FundBreakdownDTO>(
    "funds",
    `/api/v1/funds/batches/${id}/breakdown/`,
    { run },
    batch.isSuccess
  );
  const accounts = useAccounts();
  const categories = useCategories();
  const client = useQueryClient();
  const name = (account: string | null) =>
    accounts.data?.find((a) => a.id === account)?.name ?? account ?? "Ledger counterparty";
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <Link prefetch={false} className="text-xs text-kivo-primary" href="/money/sources">
          ← Back to Money Sources
        </Link>
        <Button size="sm" variant="outline" onClick={() => void invalidateFinance(client)}>
          Refresh snapshot
        </Button>
      </div>
      <QueryState query={summary} />
      <QueryState query={batch} />
      <QueryState query={journey} />
      <QueryState query={breakdown} />
      <QueryState query={accounts} />
      <QueryState query={categories} />
      {summary.isSuccess && <SnapshotStatus summary={summary.data} />}
      {batch.isSuccess && (
        <>
          <BatchCard batch={batch.data} accountName={name(batch.data.originating_account)} />
          <p className="text-xs">
            <Link prefetch={false} href={`/transactions/${batch.data.source_event}`}>
              Original funding event →
            </Link>
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <Card className="lg:col-span-7">
              <CardHeader>
                <CardTitle>Chronological Fund Journey</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {journey.isSuccess && !journey.data.length && (
                  <p className="text-xs">No Journey Events Recorded in this snapshot.</p>
                )}
                {journey.isSuccess &&
                  journey.data.map((row, index) => (
                    <div
                      key={`${row.transaction}:${index}`}
                      className="border-l-2 border-kivo-sage pl-4 py-2 text-xs space-y-1"
                    >
                      <p className="font-semibold">
                        {row.kind} • {row.title}
                      </p>
                      <p>
                        {formatDateDisplay(row.effective_date)} • <ServerMoney value={row.amount} />
                      </p>
                      <p>
                        {name(row.from_account)} → {name(row.to_account)}
                      </p>
                      {row.category && (
                        <p>
                          {categories.data?.find((c) => c.id === row.category)?.name ??
                            row.category}
                        </p>
                      )}
                      {row.claim && (
                        <p className="break-all">Receivable/payable lineage: {row.claim}</p>
                      )}
                      <Link
                        prefetch={false}
                        href={`/transactions/${row.transaction}`}
                        className="text-kivo-primary"
                      >
                        View ledger event →
                      </Link>
                    </div>
                  ))}
              </CardContent>
            </Card>
            <div className="lg:col-span-5 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Attributed Holdings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  {batch.data.positions.map((p) => (
                    <p key={p.account}>
                      {name(p.account)} • <ServerMoney value={p.amount} />
                    </p>
                  ))}
                  {batch.data.receivable_positions.map((p, index) => (
                    <p key={index} className="break-all">
                      Receivable {p.claim} • <ServerMoney value={p.amount} />
                    </p>
                  ))}
                  <p>
                    These are individual backend-assigned positions, not independently reconstructed
                    totals.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Expense Attribution by Category / Date</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  {breakdown.isSuccess && !breakdown.data.length && (
                    <p>No expense attribution in this snapshot.</p>
                  )}
                  {breakdown.isSuccess &&
                    breakdown.data.map((r, index) => (
                      <div key={index}>
                        <p className="font-semibold">{r.category_name ?? "Uncategorized"}</p>
                        <p>
                          {formatDateDisplay(r.date)} • <ServerMoney value={r.net_expense} />
                        </p>
                      </div>
                    ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
