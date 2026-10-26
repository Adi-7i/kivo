"use client";
import * as React from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppNav } from "@/components/layout/AppNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { DashboardQuickActions } from "@/features/dashboard/components/DashboardQuickActions";
import { FinancialSummaryGrid } from "@/features/dashboard/components/FinancialSummaryGrid";
import { SpendingChartCard } from "@/features/dashboard/components/SpendingChartCard";
import { CategoryBreakdownCard } from "@/features/dashboard/components/CategoryBreakdownCard";
import { AccountsOverviewCard } from "@/features/dashboard/components/AccountsOverviewCard";
import { RecentActivityCard } from "@/features/dashboard/components/RecentActivityCard";
import { QuickAddModal } from "@/features/transactions/components/QuickAddModal";
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
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader />
      <PageContainer>
        <AppNav />
        <main className="py-8 space-y-6">
          <div className="rounded-xl border border-kivo-sage/60 bg-kivo-sage/10 p-4 text-xs text-muted-foreground">
            Authoritative Django reporting. Total Balance ≠ Safe-to-Spend ≠ Budget Remaining.
            Transfers and repayments are not income; lending is not personal spending.
          </div>
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
          <QueryState query={dashboard} />
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <QueryState query={trends} />
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
                  <QueryState query={breakdown} />
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <AccountsOverviewCard accounts={data.accounts.map(accountEntity)} />
                <RecentActivityCard
                  className="lg:col-span-2"
                  transactions={data.recent_activities.map((row) =>
                    transactionEntity(row, data.accounts, categories.data ?? [])
                  )}
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Budget Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <p>
                      {data.budget_count} active budgets. Budget remaining is independent of
                      safe-to-spend.
                    </p>
                    {data.budgets.map((b) => (
                      <div key={b.id}>
                        <p className="font-semibold">
                          {b.name} • {b.warning_state}
                        </p>
                        <p>
                          Spent <MoneyAmount paise={decimalPaise(b.spent)} size="xs" /> • Remaining{" "}
                          <MoneyAmount paise={decimalPaise(b.remaining)} size="xs" />
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Rent & Reserve Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <p>
                      {data.rent.unpaid_count} unpaid obligations • {data.rent.overdue_count}{" "}
                      overdue
                    </p>
                    <p>
                      Outstanding landlord rent:{" "}
                      <MoneyAmount paise={decimalPaise(data.rent.outstanding)} size="sm" />
                    </p>
                    <Link href="/rent" prefetch={false} className="font-semibold underline">
                      Manage rent & reserves
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </main>
      </PageContainer>
      <QuickAddModal open={quickAdd} onOpenChange={setQuickAdd} defaultType={kind} />
    </div>
  );
}
