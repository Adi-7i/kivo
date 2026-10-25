import type { TransactionFilterState } from "./types";
import type { HistoryParams } from "@/features/finance/api";
import { readReportFilters } from "@/features/reports/filters";
const PERIOD = {
  today: "today",
  yesterday: "yesterday",
  this_week: "week",
  last_7_days: "last_seven_days",
  this_month: "month",
  previous_month: "previous_month",
  this_year: "year",
  all: "all",
  custom: undefined,
};
const SORT = {
  date_desc: "newest",
  date_asc: "oldest",
  amount_desc: "highest",
  amount_asc: "lowest",
};
/** Shared backend filter names keep report drill-downs within the selected scope. */
export function historyFiltersFromSearch(search: string): Partial<TransactionFilterState> {
  const url = new URLSearchParams(search);
  if (url.has("accountId")) {
    if (!url.has("account")) url.set("account", url.get("accountId")!);
    url.delete("accountId");
  }
  const params = readReportFilters(url.toString());
  const datePreset = Object.entries(PERIOD).find(([, value]) => value === params.period)?.[0] as
    TransactionFilterState["datePreset"] | undefined;
  const sortBy = Object.entries(SORT).find(([, value]) => value === params.sort)?.[0] as
    TransactionFilterState["sortBy"] | undefined;
  return {
    accountId: params.account ?? "all",
    categoryName: params.category ?? "all",
    kind: params.kind ?? "all",
    datePreset:
      params.date || params.date_from || params.date_to ? "custom" : (datePreset ?? "this_month"),
    startDate: params.date ?? params.date_from,
    endDate: params.date ?? params.date_to,
    search: params.search ?? "",
    sortBy: sortBy ?? "date_desc",
    contact: params.contact,
    merchant: params.merchant,
    paymentMethod: params.payment_method,
    amountMin: params.amount_min,
    amountMax: params.amount_max,
    destination: params.destination,
  };
}
export function historyParams(filters: TransactionFilterState, page: number): HistoryParams {
  return {
    page,
    contact: filters.contact || undefined,
    merchant: filters.merchant || undefined,
    payment_method: filters.paymentMethod || undefined,
    amount_min: filters.amountMin || undefined,
    amount_max: filters.amountMax || undefined,
    destination: filters.destination || undefined,
    search: filters.search || undefined,
    kind: filters.kind === "all" ? undefined : filters.kind,
    account: filters.accountId === "all" ? undefined : filters.accountId,
    category: filters.categoryName === "all" ? undefined : filters.categoryName,
    period: PERIOD[filters.datePreset],
    sort: SORT[filters.sortBy],
    date_from: filters.datePreset === "custom" ? filters.startDate || undefined : undefined,
    date_to: filters.datePreset === "custom" ? filters.endDate || undefined : undefined,
  };
}
