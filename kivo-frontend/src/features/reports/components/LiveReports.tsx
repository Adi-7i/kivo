"use client";
import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { QueryState } from "@/features/finance/QueryState";
import { ServerMoney } from "@/features/shared-financial/ServerMoney";
import { readReportFilters, reportSearch, type ReportParams } from "../filters";
import { useReportSummary, useReportTrends, useReportBreakdown } from "../queries";
import type { Interval, Dimension } from "../api";
import { ReportFilterBar } from "./ReportFilterBar";
import { AnalyticsSummaryCard } from "./AnalyticsSummaryCard";
import { FinancialComparison } from "./FinancialComparison";
import { SpendingTrendChart } from "./SpendingTrendChart";
import { CategoryBreakdownChart } from "./CategoryBreakdownChart";
import { IncomeExpenseChart } from "./IncomeExpenseChart";
import { SpendingDistributionChart } from "./SpendingDistributionChart";
import { ReportDetailPanel } from "./ReportDetailPanel";
import { CSVExportDialog } from "./CSVExportDialog";
import { AnalyticsSkeleton } from "./AnalyticsSkeleton";
import { FundReportPanel } from "./FundReportPanel";
export function LiveReports() {
  const search = useSearchParams(),
    router = useRouter(),
    searchKey = search.toString();
  const parsed = React.useMemo(() => {
    try {
      return { filters: readReportFilters(searchKey), error: "" };
    } catch {
      return {
        filters: { period: "month" } as ReportParams,
        error:
          "These report filters are invalid, repeated, or unsupported. Clear them to continue.",
      };
    }
  }, [searchKey]);
  const filters = parsed.filters,
    valid = !parsed.error;
  const [interval, setInterval] = React.useState<Interval>("day"),
    [dimension, setDimension] = React.useState<Dimension>("account"),
    [exportOpen, setExportOpen] = React.useState(false);
  const summary = useReportSummary(filters, valid),
    category = useReportBreakdown(filters, "category", valid && summary.isSuccess),
    // Each report holds Django's owner lock. Sequence independent reads rather
    // than occupy three sockets waiting on the same owner; continue past errors.
    trend = useReportTrends(
      filters,
      interval,
      valid && summary.isSuccess && (category.isSuccess || category.isError)
    ),
    distribution = useReportBreakdown(
      filters,
      dimension,
      valid && summary.isSuccess && (trend.isSuccess || trend.isError)
    );
  const apply = (value: ReportParams) =>
    router.replace("/reports?" + reportSearch(value), { scroll: false });
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-bold">
            Financial Analytics & Reports
          </h1>
          <p className="text-xs text-muted-foreground">
            Understand your spending, compare periods and export your transactions.
          </p>
        </div>
        <Button
          size="sm"
          disabled={!valid || !summary.isSuccess}
          onClick={() => setExportOpen(true)}
        >
          Export CSV
        </Button>
      </div>
      {parsed.error ? (
        <div role="alert" className="rounded-xl border p-4 text-sm space-y-2">
          <p>{parsed.error}</p>
          <Button size="sm" onClick={() => apply({ period: "month" })}>
            Clear Filters
          </Button>
        </div>
      ) : (
        <>
          <ReportFilterBar key={searchKey} filters={filters} onFilterChange={apply} />
          {summary.isPending ? <AnalyticsSkeleton /> : <QueryState query={summary} />}
          {summary.isSuccess && (
            <>
              <p data-testid="report-period" className="text-xs text-muted-foreground">
                {summary.data.period.period_start} to {summary.data.period.period_end} (inclusive) ·{" "}
                {summary.data.period.timezone} · {summary.data.period.currency} ·{" "}
                {summary.data.period.calendar_days} calendar days
                {summary.data.period.incomplete_period ? " · Incomplete period" : ""}
              </p>
              <AnalyticsSummaryCard summary={summary.data} />
              {summary.data.transaction_count === 0 && (
                <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                  No financial activity matches this selection.
                </p>
              )}
              <FinancialComparison summary={summary.data} />
              <div className="grid lg:grid-cols-2 gap-6 min-w-0">
                <div className="min-w-0 min-h-96">
                  <QueryState query={trend} />
                  {trend.isSuccess && (
                    <SpendingTrendChart
                      key={searchKey + interval}
                      data={trend.data}
                      interval={interval}
                      onInterval={setInterval}
                    />
                  )}
                </div>
                <div className="min-w-0 min-h-96">
                  <QueryState query={category} />
                  {category.isSuccess && (
                    <CategoryBreakdownChart
                      key={searchKey}
                      data={category.data}
                      total={summary.data.personal_expense}
                      onSelectCategory={(row) => {
                        if (row.key) apply({ ...filters, category: row.key });
                      }}
                    />
                  )}
                </div>
              </div>
              <div className="grid lg:grid-cols-2 gap-6 min-w-0">
                <IncomeExpenseChart summary={summary.data} />
                <div className="min-w-0 min-h-96">
                  <QueryState query={distribution} />
                  <SpendingDistributionChart
                    data={distribution.isSuccess ? distribution.data : undefined}
                    dimension={dimension}
                    onDimension={setDimension}
                  />
                </div>
              </div>
              {distribution.isSuccess && (
                <ReportDetailPanel
                  key={searchKey + dimension}
                  data={distribution.data}
                  filters={filters}
                />
              )}
              <details className="rounded-xl border bg-card p-4 text-xs">
                <summary>Financial movement classifications</summary>
                <dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                  {(
                    [
                      ["Borrowed", summary.data.borrowed],
                      ["Lent", summary.data.lent],
                      ["Repayments received", summary.data.repayments_received],
                      ["Payable settlements", summary.data.payable_settlements],
                      ["Internal transfers", summary.data.internal_transfers],
                      ["Shared advances", summary.data.shared_advances],
                      ["Borrowed principal repaid", summary.data.principal_repaid],
                      ["Shared settlements paid", summary.data.shared_settlements_paid],
                      ["Refunds received", summary.data.refunds_received],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd>
                        <ServerMoney value={value} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </details>
              <p className="text-[11px] text-muted-foreground">
                Cash movements and personal spending are shown separately. Transfers, loans and
                repayments are not ordinary income or spending.
              </p>
              <FundReportPanel />
              {exportOpen && (
                <CSVExportDialog
                  key={searchKey}
                  open
                  onOpenChange={setExportOpen}
                  filters={filters}
                  defaultStartDate={summary.data.period.period_start}
                  defaultEndDate={summary.data.period.period_end}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
