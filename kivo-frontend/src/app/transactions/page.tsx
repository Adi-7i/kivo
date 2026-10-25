"use client";
import * as React from "react";
import { useSearchParams } from "next/navigation";
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
import type { TransactionFilterState } from "@/features/transactions/types";
import { accountEntity, transactionEntity } from "@/features/finance/api";
import { useAccounts, useCategories, useHistory } from "@/features/finance/queries";
import { QueryState } from "@/features/finance/QueryState";
import { historyParams, historyFiltersFromSearch } from "@/features/transactions/history";
const DEFAULT_FILTERS: TransactionFilterState = {
  search: "",
  kind: "all",
  accountId: "all",
  categoryName: "all",
  datePreset: "this_month",
  sortBy: "date_desc",
};
function HistoryContent() {
  const params = useSearchParams();
  const initial = React.useMemo(() => {
    try {
      return { filters: historyFiltersFromSearch(params.toString()), error: "" };
    } catch {
      return {
        filters: {},
        error: "The transaction filters are invalid. Reset filters to continue.",
      };
    }
  }, [params]);
  const [filterError, setFilterError] = React.useState(initial.error);
  const [filters, setFilters] = React.useState<TransactionFilterState>({
    ...DEFAULT_FILTERS,
    ...initial.filters,
  });
  const [page, setPage] = React.useState(1);
  const [quickAdd, setQuickAdd] = React.useState(false);
  const accounts = useAccounts();
  const categories = useCategories();
  const [deferredSearch, setDeferredSearch] = React.useState(filters.search);
  React.useEffect(() => {
    const timer = setTimeout(() => setDeferredSearch(filters.search), 300);
    return () => clearTimeout(timer);
  }, [filters.search]);
  const query = useHistory(
    historyParams({ ...filters, search: deferredSearch }, page),
    !filterError
  );
  const update = (changes: Partial<TransactionFilterState>) => {
    setFilters((old) => ({ ...old, ...changes }));
    setPage(1);
  };
  const reset = () => {
    setFilterError("");
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  };
  const transactions = (query.data?.results ?? []).map((event) =>
    transactionEntity(event, accounts.data ?? [], categories.data ?? [])
  );
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader />
      <PageContainer>
        <AppNav />
        <main className="py-8 space-y-6">
          <SectionHeader
            title="Transaction Activity"
            description="Your authoritative financial history. Transfers move money between owned accounts; opening balances are not income."
            actions={
              <Button size="sm" className="gap-1.5" onClick={() => setQuickAdd(true)}>
                <PlusCircle className="size-4" />
                Quick Add
              </Button>
            }
          />
          <TransactionFilterBar
            filters={filters}
            onFilterChange={update}
            onReset={reset}
            accounts={(accounts.data ?? []).map(accountEntity)}
            categories={categories.data ?? []}
          />
          <DateRangeFilter
            selectedPreset={filters.datePreset}
            onPresetChange={(datePreset) => update({ datePreset })}
            startDate={filters.startDate}
            endDate={filters.endDate}
            onCustomDateChange={(startDate, endDate) => update({ startDate, endDate })}
          />
          <QueryState query={accounts} />
          {filterError && (
            <p role="alert" className="text-xs text-destructive">
              {filterError}{" "}
              <Button size="sm" variant="outline" onClick={reset}>
                Reset Filters
              </Button>
            </p>
          )}
          {(filters.contact ||
            filters.merchant ||
            filters.paymentMethod ||
            filters.amountMin ||
            filters.amountMax ||
            filters.destination) && (
            <div className="rounded-lg border p-3 text-xs space-y-2">
              <p>
                Report filters: {filters.contact ? "Contact " + filters.contact + ". " : ""}
                {filters.merchant ? "Merchant " + filters.merchant + ". " : ""}
                {filters.paymentMethod ? "Payment method " + filters.paymentMethod + ". " : ""}
                {filters.amountMin ? "Minimum INR " + filters.amountMin + ". " : ""}
                {filters.amountMax ? "Maximum INR " + filters.amountMax + ". " : ""}
                {filters.destination ? "Destination " + filters.destination : ""}
              </p>
              <Button size="sm" variant="outline" onClick={reset}>
                Clear Report Filters
              </Button>
            </div>
          )}
          <QueryState query={categories} />
          <QueryState query={query} />
          {query.isSuccess &&
            accounts.isSuccess &&
            categories.isSuccess &&
            (transactions.length ? (
              <div className="space-y-4">
                <div className="hidden lg:block">
                  <TransactionTable transactions={transactions} />
                </div>
                <div className="lg:hidden">
                  <TransactionListMobile transactions={transactions} />
                </div>
                <TransactionPagination
                  currentPage={page}
                  totalPages={Math.ceil(query.data.count / 20)}
                  totalItems={query.data.count}
                  pageSize={20}
                  onPageChange={setPage}
                />
              </div>
            ) : (
              <FinancialEmptyState
                icon={<SearchX className="size-6" />}
                title="No Matching Transactions"
                description="No Django records match these filters."
                action={
                  <Button size="sm" variant="outline" onClick={reset}>
                    Reset All Filters
                  </Button>
                }
              />
            ))}
        </main>
      </PageContainer>
      <QuickAddModal open={quickAdd} onOpenChange={setQuickAdd} />
    </div>
  );
}
export default function TransactionsPage() {
  return (
    <React.Suspense fallback={<p role="status">Loading transaction filters…</p>}>
      <HistoryContent />
    </React.Suspense>
  );
}
