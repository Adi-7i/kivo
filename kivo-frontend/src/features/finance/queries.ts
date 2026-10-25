"use client";
import { useQuery, type QueryClient } from "@tanstack/react-query";
import { useSession } from "@/features/auth/session";
import { financeApi, type HistoryParams } from "./api";

export function useAccounts(enabled = true) {
  const { data: user } = useSession();
  return useQuery({
    queryKey: ["accounts", user?.id, "all"],
    queryFn: ({ signal }) => financeApi.accounts(signal),
    enabled: !!user && enabled,
    retry: false,
  });
}
export function useCategories(enabled = true) {
  const { data: user } = useSession();
  return useQuery({
    queryKey: ["categories", user?.id],
    queryFn: ({ signal }) => financeApi.categories(signal),
    enabled: !!user && enabled,
    retry: false,
  });
}
export function useHistory(params: HistoryParams, enabled = true) {
  const { data: user } = useSession();
  return useQuery({
    queryKey: ["transactions", user?.id, params],
    queryFn: ({ signal }) => financeApi.history(params, signal),
    enabled: !!user && enabled,
    retry: false,
  });
}
export function invalidateFinance(client: QueryClient): Promise<void[]> {
  return Promise.all(
    [
      "accounts",
      "transactions",
      "funds",
      "funding",
      "summary",
      "reports",
      "budgets",
      "dashboard",
      "contacts",
      "claims",
      "loans",
      "settlements",
      "shared-bills",
      "rent-plans",
      "rent-obligations",
      "rent-payments",
      "rent-reserves",
      "spending-capacity",
    ].map((key) => client.invalidateQueries({ queryKey: [key] }))
  );
}
