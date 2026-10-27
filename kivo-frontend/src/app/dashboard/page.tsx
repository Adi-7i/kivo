"use client";
import * as React from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { DashboardQuickActions } from "@/features/dashboard/components/DashboardQuickActions";
import { FinancialSummaryGrid } from "@/features/dashboard/components/FinancialSummaryGrid";
import { SpendingChartCard } from "@/features/dashboard/components/SpendingChartCard";
import { CategoryBreakdownCard } from "@/features/dashboard/components/CategoryBreakdownCard";
import { AccountsOverviewCard } from "@/features/dashboard/components/AccountsOverviewCard";
import { RecentActivityCard } from "@/features/dashboard/components/RecentActivityCard";
import { QuickAddModal } from "@/features/transactions/components/QuickAddModal";
import { DashboardSkeleton } from "@/features/dashboard/components/DashboardSkeleton";
import { ChartSkeleton } from "@/features/shared-financial/FinancialSkeleton";
import { QueryState } from "@/features/finance/QueryState";
import { accountEntity, transactionEntity, decimalPaise } from "@/features/finance/api";
import { useCategories } from "@/features/finance/queries";
import { useOwnedQuery } from "@/features/finance/useOwnedQuery";
import {
  dashboardMetrics,
  type DashboardDTO,
  type TrendsDTO,
  type BreakdownDTO,
} from "@/features/dashboard/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { formatDateDisplay } from "@/lib/formatters/date";

export default function DashboardPage() {
  const dashboard = useOwnedQuery<DashboardDTO>("dashboard", "/api/v1/dashboard/", {
    period: "month",
  });
  const categories = useCategories();
  const [range, setRange] = React.useState<"last_seven_days" | "month">("last_seven_days");
  const trends = useOwnedQuery<TrendsDTO>(
    "reports",
    "/api/v1/reports/trends/",
    {
      period: range,
      interval: "day",
    },
    dashboard.isSuccess
  );
  const breakdown = useOwnedQuery<BreakdownDTO>(
    "reports",
    "/api/v1/reports/breakdown/",
    {
      period: "month",
      dimension: "category",
    },
    dashboard.isSuccess
  );
  const [quickAdd, setQuickAdd] = React.useState(false);
  const [kind, setKind] = React.useState<"expense" | "receipt" | "transfer">("expense");
  const open = (value: typeof kind) => {
    setKind(value);
    setQuickAdd(true);
  };
  const data = dashboard.data;
  return (
    <div className="flex flex-col bg-background text-foreground">
      <PageContainer>
        <section className="py-8 space-y-6">
          <DashboardHeader
            onQuickAdd={() => open("expense")}
            dateContext={
              data
                ? `${formatDateDisplay(data.as_of_date)} • ${data.timezone}`
                : "Checking report date…"
            }
          />
          <DashboardQuickActions
            onAddExpense={() => open("expense")}
            onAddReceipt={() => open("receipt")}
            onAddTransfer={() => open("transfer")}
          />
          <QueryState query={dashboard} loading={<DashboardSkeleton />} />
          {data && dashboard.isSuccess && (
            <>
              <div data-testid="dashboard-metrics">
                <FinancialSummaryGrid metrics={dashboardMetrics(data)} />
              </div>
              <div className="flex flex-wrap gap-4 text-xs" data-testid="dashboard-periods">
                <span>
                  Weekly expenses:{" "}
                  <MoneyAmount paise={decimalPaise(data.spending.week)} size="xs" />
                </span>
                <span>
                  Yearly expenses:{" "}
                  <MoneyAmount paise={decimalPaise(data.spending.year)} size="xs" />
                </span>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="min-w-0 xl:col-span-2">
                  <QueryState query={trends} loading={<ChartSkeleton />} />
                  {trends.isSuccess && (
                    <SpendingChartCard
                      range={range}
                      onRangeChange={setRange}
                      data={trends.data.results.map((row) => ({
                        date: row.date,
                        displayDate: formatDateDisplay(row.date),
                        expensePaise: decimalPaise(row.amount),
                      }))}
                    />
                  )}
                </div>
                <div>
                  <QueryState query={breakdown} loading={<ChartSkeleton />} />
                  {breakdown.isSuccess && (
                    <CategoryBreakdownCard
                      categories={breakdown.data.results.map((row) => ({
                        categoryName: row.label || "Uncategorized",
                        amountPaise: decimalPaise(row.amount),
                        color: "var(--color-kivo-primary)",
                      }))}
                    />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <AccountsOverviewCard accounts={data.accounts.map(accountEntity)} />
                <RecentActivityCard
                  className="xl:col-span-2"
                  transactions={data.recent_activities.map((row) =>
                    transactionEntity(row, data.accounts, categories.data ?? [])
                  )}
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="card-hover-interactive border-border/80 shadow-card">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div>
                      <CardTitle className="text-base font-bold font-heading">Budget Summary</CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">
                        {data.budget_count} active budgets • Budget remaining is independent of safe-to-spend.
                      </CardDescription>
                    </div>
                    <Link
                      href="/budgets"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-kivo-primary hover:text-kivo-secondary transition-colors"
                    >
                      <span>Manage</span>
                    </Link>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs pt-1">
                    {data.budgets.length === 0 ? (
                      <p className="text-muted-foreground py-4 text-center">
                        No active budgets set for this cycle.
                      </p>
                    ) : (
                      data.budgets.map((b) => (
                        <div
                          key={b.id}
                          className="space-y-1.5 rounded-xl border border-border/60 bg-muted/20 p-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground">
                              {b.name} • {b.warning_state}
                            </span>
                          </div>
                          <p className="text-muted-foreground">
                            Spent <MoneyAmount paise={decimalPaise(b.spent)} size="xs" tabular /> • Remaining{" "}
                            <MoneyAmount paise={decimalPaise(b.remaining)} size="xs" tabular />
                          </p>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
                <Card className="card-hover-interactive border-border/80 shadow-card">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div>
                      <CardTitle className="text-base font-bold font-heading">Rent &amp; Reserve Summary</CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">
                        {data.rent.unpaid_count} unpaid obligations • {data.rent.overdue_count} overdue
                      </CardDescription>
                    </div>
                    <Link
                      href="/rent"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-kivo-primary hover:text-kivo-secondary transition-colors"
                    >
                      <span>Manage</span>
                    </Link>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs pt-1">
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
                      <p className="text-muted-foreground">
                        Outstanding landlord rent:{" "}
                        <MoneyAmount
                          paise={decimalPaise(data.rent.outstanding)}
                          size="sm"
                          tabular
                        />
                      </p>
                      <Link
                        href="/rent"
                        prefetch={false}
                        className="inline-block font-semibold text-kivo-primary hover:underline"
                      >
                        Manage rent &amp; reserves
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </section>
      </PageContainer>
      <QuickAddModal open={quickAdd} onOpenChange={setQuickAdd} defaultType={kind} />
    </div>
  );
}
