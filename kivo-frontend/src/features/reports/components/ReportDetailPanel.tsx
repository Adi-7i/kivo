"use client";
import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ServerMoney } from "@/features/shared-financial/ServerMoney";
import { transactionHref, type ReportParams } from "../filters";
import type { BreakdownDTO, Dimension } from "../api";
export function ReportDetailPanel({
  data,
  filters,
}: {
  data: BreakdownDTO;
  filters: ReportParams;
}) {
  const [page, setPage] = React.useState(1);
  const dimension = data.dimension as Dimension;
  const extra = (key: string): ReportParams =>
    dimension === "category"
      ? { category: key }
      : dimension === "account"
        ? { account: key }
        : dimension === "contact"
          ? { contact: key }
          : dimension === "merchant"
            ? { merchant: key }
            : dimension === "payment_method"
              ? { payment_method: key }
              : { kind: key as ReportParams["kind"] };
  const pages = Math.max(1, Math.ceil(data.results.length / 20));
  return (
    <section className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4 min-w-0">
      <div className="flex flex-wrap justify-between gap-3">
        <h2 className="font-heading font-bold text-base">Detailed Expenditure Breakdown</h2>
        <Link className="text-xs text-kivo-primary underline" href={transactionHref(filters)}>
          View Filtered Transactions
        </Link>
      </div>
      <div className="overflow-auto max-h-96">
        <table className="w-full min-w-[400px] text-xs">
          <caption className="text-left text-muted-foreground pb-2">
            {dimension} · Your net spending · INR
          </caption>
          <thead>
            <tr className="border-b text-left">
              <th scope="col" className="py-2">
                Group
              </th>
              <th scope="col">Transactions</th>
              <th scope="col">Amount</th>
              <th scope="col">History</th>
            </tr>
          </thead>
          <tbody>
            {data.results.slice((page - 1) * 20, page * 20).map((r) => (
              <tr key={r.key ?? "unassigned"} className="border-b border-border/40">
                <th scope="row" className="text-left font-medium py-3">
                  {r.label || "Unassigned"}
                </th>
                <td>{r.transaction_count}</td>
                <td>
                  <ServerMoney value={r.amount} />
                </td>
                <td>
                  {r.key ? (
                    <Link
                      className="text-kivo-primary underline"
                      href={transactionHref(filters, extra(r.key))}
                    >
                      View transactions
                    </Link>
                  ) : (
                    "No filter for unassigned"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!data.results.length && (
        <p className="text-xs text-muted-foreground">No expense groups in this selection.</p>
      )}
      <div className="flex gap-2 items-center text-xs">
        <Button
          size="sm"
          variant="outline"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous groups
        </Button>
        <span>
          Page {page} of {pages}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={page >= pages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next groups
        </Button>
      </div>
    </section>
  );
}
