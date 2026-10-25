"use client";
import * as React from "react";
import Link from "next/link";
import { useOwnedQuery } from "@/features/finance/useOwnedQuery";
import { QueryState } from "@/features/finance/QueryState";
import { Button } from "@/components/ui/button";
import { ServerMoney } from "@/features/shared-financial/ServerMoney";
import type { FundSummaryDTO } from "@/features/funding/api";
import type { PaginatedResponse } from "@/types/api";
import type { ReportFundDTO } from "../api";
export function FundReportPanel() {
  const [open, setOpen] = React.useState(false),
    [page, setPage] = React.useState(1);
  const snapshot = useOwnedQuery<FundSummaryDTO>("funds", "/api/v1/funds/summary/", {}, open);
  const rows = useOwnedQuery<PaginatedResponse<ReportFundDTO>>(
    "reports",
    "/api/v1/reports/funds/",
    { page, ...(snapshot.data?.run_id ? { run: snapshot.data.run_id } : {}) },
    open && snapshot.isSuccess
  );
  return (
    <section className="rounded-2xl border bg-card p-5 space-y-3 min-w-0">
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        Fund Attribution Report
      </Button>
      {open && (
        <>
          <p className="text-xs text-muted-foreground">
            Current pinned FIFO snapshot; this report does not accept the selected transaction-date
            filters. Attribution is accounting lineage, not physical currency. Recoverable capacity
            is separate from liquid cash.
          </p>
          <QueryState query={snapshot} />
          <QueryState query={rows} />
          {snapshot.data && (
            <p className="text-xs break-all">
              Attribution: {snapshot.data.attribution_status} · Snapshot{" "}
              {snapshot.data.run_id ?? "Not computed"}
            </p>
          )}
          {rows.data && (
            <>
              <div className="overflow-auto">
                <table className="min-w-[650px] w-full text-xs">
                  <caption className="sr-only">Server fund attribution in INR</caption>
                  <thead>
                    <tr>
                      {[
                        "Source",
                        "Original",
                        "Expense attributed",
                        "Refund restored",
                        "Remaining capacity",
                        "Journey",
                      ].map((t) => (
                        <th key={t} scope="col" className="text-left py-2">
                          {t}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.data.results.map((r) => (
                      <tr key={r.id} className="border-t">
                        <th scope="row" className="text-left py-3 font-medium">
                          {r.funding_source || r.source_type}
                        </th>
                        <td>
                          <ServerMoney value={r.original_amount} />
                        </td>
                        <td>
                          <ServerMoney value={r.expense_attributed} />
                        </td>
                        <td>
                          <ServerMoney value={r.refund_restored} />
                        </td>
                        <td>
                          <ServerMoney value={r.remaining_capacity} />
                        </td>
                        <td>
                          <Link
                            href={"/money/sources/" + r.id}
                            className="underline text-kivo-primary"
                          >
                            View Journey
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!rows.data.count && <p className="text-xs">No funding batches.</p>}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!rows.data.previous}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous sources
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!rows.data.next}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next sources
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
