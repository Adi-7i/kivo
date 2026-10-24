import type { TransactionFilterState } from "./types";
import type { HistoryParams } from "@/features/finance/api";
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
export function historyParams(filters: TransactionFilterState, page: number): HistoryParams {
  return {
    page,
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
