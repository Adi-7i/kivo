"use client";

import * as React from "react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import type {
  FinancialSummaryMetrics,
  SpendingChartDataPoint,
  CategoryDistribution,
} from "@/features/dashboard/types";
import type { AccountEntity } from "@/features/accounts/types";
import type { TransactionEntity } from "@/features/transactions/types";

const PREVIEW_METRICS: FinancialSummaryMetrics = {
  liquidBalancePaise: 5325000,   // ₹53,250.00
  safeToSpendPaise: 3825000,     // ₹38,250.00
  todayExpensePaise: 45000,      // ₹450.00
  monthExpensePaise: 1450000,    // ₹14,500.00
  monthReceivedPaise: 7500000,   // ₹75,000.00
  moneyOwedToUserPaise: 500000,  // ₹5,000.00
  moneyOwedByUserPaise: 200000,  // ₹2,000.00
  reservedFundsPaise: 1500000,   // ₹15,000.00
};

const PREVIEW_CHART_DATA: SpendingChartDataPoint[] = [
  { date: "2026-10-11", displayDate: "11 Oct", expensePaise: 120000, receiptPaise: 0 },
  { date: "2026-10-12", displayDate: "12 Oct", expensePaise: 85000, receiptPaise: 0 },
  { date: "2026-10-13", displayDate: "13 Oct", expensePaise: 240000, receiptPaise: 0 },
  { date: "2026-10-14", displayDate: "14 Oct", expensePaise: 65000, receiptPaise: 0 },
  { date: "2026-10-15", displayDate: "15 Oct", expensePaise: 190000, receiptPaise: 500000 },
  { date: "2026-10-16", displayDate: "16 Oct", expensePaise: 310000, receiptPaise: 0 },
  { date: "2026-10-17", displayDate: "17 Oct", expensePaise: 45000, receiptPaise: 0 },
];

const PREVIEW_CATEGORIES: CategoryDistribution[] = [
  { categoryName: "Food & Groceries", amountPaise: 620000, percentage: 43, color: "#3A5A40" },
  { categoryName: "Utilities & Bills", amountPaise: 350000, percentage: 24, color: "#588157" },
  { categoryName: "Transit & Fuel", amountPaise: 240000, percentage: 17, color: "#A3B18A" },
  { categoryName: "Entertainment", amountPaise: 150000, percentage: 10, color: "#8F5E14" },
  { categoryName: "Other", amountPaise: 90000, percentage: 6, color: "#5B685D" },
];

const PREVIEW_ACCOUNTS: AccountEntity[] = [
  {
    id: "acc-bank-1",
    name: "HDFC Salary Account",
    kind: "bank",
    balancePaise: 4850000,
    openingBalancePaise: 2500000,
    openedOn: "2026-01-10",
    archived: false,
    createdAt: "2026-01-10T10:00:00Z",
  },
  {
    id: "acc-cash-1",
    name: "Physical Cash Stash",
    kind: "cash",
    balancePaise: 350000,
    openingBalancePaise: 500000,
    openedOn: "2026-01-10",
    archived: false,
    createdAt: "2026-01-10T10:05:00Z",
  },
  {
    id: "acc-wallet-1",
    name: "Amazon Pay Wallet",
    kind: "wallet",
    balancePaise: 125000,
    openingBalancePaise: 0,
    openedOn: "2026-02-01",
    archived: false,
    createdAt: "2026-02-01T12:00:00Z",
  },
];

const PREVIEW_TRANSACTIONS: TransactionEntity[] = [
  {
    id: "tx-1",
    kind: "expense",
    title: "Zepto Quick Groceries",
    amountPaise: 45000,
    effectiveDate: "2026-10-17",
    createdAt: "2026-10-17T09:30:00Z",
    status: "posted",
    accountId: "acc-bank-1",
    accountName: "HDFC Salary Account",
    categoryName: "Food & Groceries",
    merchant: "Zepto",
    paymentMethod: "UPI",
  },
  {
    id: "tx-2",
    kind: "transfer",
    title: "ATM Cash Withdrawal",
    amountPaise: 200000,
    effectiveDate: "2026-10-16",
    createdAt: "2026-10-16T14:15:00Z",
    status: "posted",
    accountId: "acc-bank-1",
    accountName: "HDFC Salary Account",
    destinationId: "acc-cash-1",
    destinationName: "Physical Cash Stash",
    notes: "Pocket money top-up",
  },
  {
    id: "tx-3",
    kind: "receipt",
    title: "Freelance Design Retainer",
    amountPaise: 500000,
    effectiveDate: "2026-10-15",
    createdAt: "2026-10-15T11:00:00Z",
    status: "posted",
    accountId: "acc-bank-1",
    accountName: "HDFC Salary Account",
  },
  {
    id: "tx-4",
    kind: "expense",
    title: "Electricity & Water Bill",
    amountPaise: 190000,
    effectiveDate: "2026-10-15",
    createdAt: "2026-10-15T16:20:00Z",
    status: "posted",
    accountId: "acc-bank-1",
    accountName: "HDFC Salary Account",
    categoryName: "Utilities & Bills",
  },
];

export default function DashboardPage() {
  const [isQuickAddOpen, setIsQuickAddOpen] = React.useState(false);
  const [quickAddType, setQuickAddType] = React.useState<"expense" | "receipt" | "transfer">("expense");

  const openQuickAdd = (type: "expense" | "receipt" | "transfer" = "expense") => {
    setQuickAddType(type);
    setIsQuickAddOpen(true);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader />
      <PageContainer>
        <AppNav />

        <main className="py-8 space-y-6">
          {/* Foundation Status Alert */}
          <Alert className="border-kivo-sage/60 bg-kivo-sage/10 text-foreground">
            <Info className="size-4 text-kivo-primary" />
            <AlertTitle className="font-semibold text-kivo-brand-dark dark:text-kivo-sage">
              Financial Dashboard Architecture (Phase 3)
            </AlertTitle>
            <AlertDescription className="text-muted-foreground mt-1 text-xs">
              Demonstrating 8 distinct summary metrics, Recharts daily spending analytics, category distributions, and the accessible Quick Add transaction modal. All values operate under integer paise invariants.
            </AlertDescription>
          </Alert>

          {/* Overview Header */}
          <DashboardHeader onQuickAdd={() => openQuickAdd("expense")} />

          {/* Quick Actions Bar */}
          <DashboardQuickActions
            onAddExpense={() => openQuickAdd("expense")}
            onAddReceipt={() => openQuickAdd("receipt")}
            onAddTransfer={() => openQuickAdd("transfer")}
          />

          {/* Financial Summary Grid (8 Cards) */}
          <FinancialSummaryGrid metrics={PREVIEW_METRICS} />

          {/* Analytics Grid: Spending Chart & Category Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SpendingChartCard
              data={PREVIEW_CHART_DATA}
              className="lg:col-span-2"
            />
            <CategoryBreakdownCard categories={PREVIEW_CATEGORIES} />
          </div>

          {/* Bottom Grid: Money Repositories & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <AccountsOverviewCard accounts={PREVIEW_ACCOUNTS} />
            <RecentActivityCard
              transactions={PREVIEW_TRANSACTIONS}
              className="lg:col-span-2"
            />
          </div>
        </main>
      </PageContainer>

      <QuickAddModal
        open={isQuickAddOpen}
        onOpenChange={setIsQuickAddOpen}
        defaultType={quickAddType}
        accounts={PREVIEW_ACCOUNTS}
      />
    </div>
  );
}
