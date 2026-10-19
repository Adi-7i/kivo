"use client";

import * as React from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppNav } from "@/components/layout/AppNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { SectionHeader } from "@/features/shared-financial/SectionHeader";
import { TransactionFilterBar } from "@/features/transactions/components/TransactionFilterBar";
import { DateRangeFilter } from "@/features/transactions/components/DateRangeFilter";
import { TransactionTable } from "@/features/transactions/components/TransactionTable";
import { TransactionListMobile } from "@/features/transactions/components/TransactionListMobile";
import { TransactionPagination } from "@/features/transactions/components/TransactionPagination";
import { FinancialEmptyState } from "@/features/shared-financial/FinancialEmptyState";
import { QuickAddModal } from "@/features/transactions/components/QuickAddModal";
import { Button } from "@/components/ui/button";
import { PlusCircle, SearchX } from "lucide-react";
import type {
  TransactionEntity,
  TransactionFilterState,
  DatePreset,
} from "@/features/transactions/types";
import type { AccountEntity } from "@/features/accounts/types";
import {
  isSameDay,
  isSameMonth,
  isSameYear,
  subDays,
  subMonths,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  endOfDay,
} from "date-fns";
import { parseDateOnly } from "@/lib/formatters/date";

const INITIAL_ACCOUNTS: AccountEntity[] = [
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

const INITIAL_CATEGORIES = [
  "Food & Groceries",
  "Utilities & Bills",
  "Transit & Fuel",
  "Living Expenses",
  "Entertainment",
  "Healthcare",
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
  {
    id: "tx-5",
    kind: "expense",
    title: "Metro Smart Card Recharge",
    amountPaise: 50000,
    effectiveDate: "2026-10-14",
    createdAt: "2026-10-14T08:15:00Z",
    status: "posted",
    accountId: "acc-wallet-1",
    accountName: "Amazon Pay Wallet",
    categoryName: "Transit & Fuel",
    merchant: "Delhi Metro DMRC",
  },
  {
    id: "tx-6",
    kind: "expense",
    title: "Weekend Team Dinner",
    amountPaise: 310000,
    effectiveDate: "2026-10-13",
    createdAt: "2026-10-13T20:45:00Z",
    status: "posted",
    accountId: "acc-bank-1",
    accountName: "HDFC Salary Account",
    categoryName: "Food & Groceries",
    merchant: "Toit Brewery",
  },
  {
    id: "tx-7",
    kind: "opening",
    title: "Initial Bank Balance",
    amountPaise: 2500000,
    effectiveDate: "2026-01-10",
    createdAt: "2026-01-10T10:00:00Z",
    status: "posted",
    accountId: "acc-bank-1",
    accountName: "HDFC Salary Account",
    notes: "Baseline equity initialization",
  },
];

const emptySubscribe = () => () => {};
const getClientToday = () => new Date().toISOString().slice(0, 10);
const getServerToday = () => "2026-10-18";

export default function TransactionsPage() {
  const [filters, setFilters] = React.useState<TransactionFilterState>({
    search: "",
    kind: "all",
    accountId: "all",
    categoryName: "all",
    datePreset: "this_month",
    sortBy: "date_desc",
  });

  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 10;
  const [isQuickAddOpen, setIsQuickAddOpen] = React.useState(false);
  const todayStr = React.useSyncExternalStore(emptySubscribe, getClientToday, getServerToday);
  const today = React.useMemo(() => parseDateOnly(todayStr), [todayStr]);

  const handleFilterChange = (updates: Partial<TransactionFilterState>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters({
      search: "",
      kind: "all",
      accountId: "all",
      categoryName: "all",
      datePreset: "this_month",
      sortBy: "date_desc",
    });
    setCurrentPage(1);
  };

  // Filter & sort transactions in memory for UI presentation
  const filteredTransactions = React.useMemo(() => {
    return PREVIEW_TRANSACTIONS.filter((tx) => {
      // 1. Search filter
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const matchesTitle = tx.title.toLowerCase().includes(query);
        const matchesMerchant = tx.merchant?.toLowerCase().includes(query);
        const matchesNotes = tx.notes?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesMerchant && !matchesNotes) return false;
      }

      // 2. Kind filter
      if (filters.kind !== "all" && tx.kind !== filters.kind) {
        return false;
      }

      // 3. Account filter
      if (filters.accountId !== "all") {
        if (tx.accountId !== filters.accountId && tx.destinationId !== filters.accountId) {
          return false;
        }
      }

      // 4. Category filter
      if (filters.categoryName !== "all" && tx.categoryName !== filters.categoryName) {
        return false;
      }

      // 5. Date filter (calendar weeks vs rolling 7-days faithfully separated)
      if (filters.datePreset !== "all") {
        try {
          const txDate = parseDateOnly(tx.effectiveDate);

          switch (filters.datePreset) {
            case "today":
              if (!isSameDay(txDate, today)) return false;
              break;
            case "yesterday":
              if (!isSameDay(txDate, subDays(today, 1))) return false;
              break;
            case "this_week": {
              // Calendar week Monday to Sunday
              const weekStart = startOfWeek(today, { weekStartsOn: 1 });
              const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
              if (!isWithinInterval(txDate, { start: weekStart, end: weekEnd })) return false;
              break;
            }
            case "last_7_days": {
              // Rolling 7-day period ending today
              const sevenDaysAgo = subDays(today, 6);
              if (!isWithinInterval(txDate, { start: sevenDaysAgo, end: endOfDay(today) }))
                return false;
              break;
            }
            case "this_month":
              if (!isSameMonth(txDate, today) || !isSameYear(txDate, today)) return false;
              break;
            case "previous_month": {
              const prevMonth = subMonths(today, 1);
              if (!isSameMonth(txDate, prevMonth) || !isSameYear(txDate, prevMonth)) return false;
              break;
            }
            case "this_year":
              if (!isSameYear(txDate, today)) return false;
              break;
            case "custom":
              if (filters.startDate && tx.effectiveDate < filters.startDate) return false;
              if (filters.endDate && tx.effectiveDate > filters.endDate) return false;
              break;
          }
        } catch {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (filters.sortBy === "date_desc") {
        return b.effectiveDate.localeCompare(a.effectiveDate);
      }
      if (filters.sortBy === "date_asc") {
        return a.effectiveDate.localeCompare(b.effectiveDate);
      }
      if (filters.sortBy === "amount_desc") {
        return b.amountPaise - a.amountPaise;
      }
      if (filters.sortBy === "amount_asc") {
        return a.amountPaise - b.amountPaise;
      }
      return 0;
    });
  }, [filters, today]);

  const totalPages = Math.ceil(filteredTransactions.length / pageSize);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader />
      <PageContainer>
        <AppNav />

        <main className="py-8 space-y-6">
          <SectionHeader
            title="Transaction Activity"
            description="Complete chronological ledger events, filtering by account, date range, and categories."
            actions={
              <Button
                size="sm"
                onClick={() => setIsQuickAddOpen(true)}
                className="gap-1.5 font-medium bg-kivo-primary hover:bg-kivo-secondary text-white"
              >
                <PlusCircle className="size-4" />
                <span>Quick Add</span>
              </Button>
            }
          />

          {/* Date Range Preset Selector */}
          <DateRangeFilter
            selectedPreset={filters.datePreset}
            onPresetChange={(preset: DatePreset) => handleFilterChange({ datePreset: preset })}
            startDate={filters.startDate}
            endDate={filters.endDate}
            onCustomDateChange={(start, end) =>
              handleFilterChange({ startDate: start, endDate: end })
            }
          />

          {/* Search & Filter Bar */}
          <TransactionFilterBar
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
            accounts={INITIAL_ACCOUNTS}
            categories={INITIAL_CATEGORIES}
          />

          {/* Results Presentation */}
          {paginatedTransactions.length === 0 ? (
            <FinancialEmptyState
              icon={<SearchX className="size-6" />}
              title="No Matching Transactions"
              description="No financial events match your selected filters. Try broadening your search or resetting active filters."
              action={
                <Button variant="outline" size="sm" onClick={handleResetFilters}>
                  Reset All Filters
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {/* Desktop Table */}
              <div className="hidden lg:block">
                <TransactionTable transactions={paginatedTransactions} />
              </div>

              {/* Mobile Timeline Cards */}
              <div className="lg:hidden">
                <TransactionListMobile transactions={paginatedTransactions} />
              </div>

              {/* Pagination Controls */}
              <TransactionPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredTransactions.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </main>
      </PageContainer>

      <QuickAddModal
        open={isQuickAddOpen}
        onOpenChange={setIsQuickAddOpen}
        accounts={INITIAL_ACCOUNTS}
        categories={INITIAL_CATEGORIES}
      />
    </div>
  );
}
