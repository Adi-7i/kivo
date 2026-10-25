import { apiClient } from "@/lib/api/client";
import type { components } from "@/types/django.generated";
import type { PaginatedResponse } from "@/types/api";
import type { AccountEntity } from "@/features/accounts/types";
import type { TransactionEntity } from "@/features/transactions/types";

type Schemas = components["schemas"];
export type AccountDTO = Schemas["Account"];
export type CategoryDTO = Schemas["Category"];
export type EventDTO = Schemas["Event"];
export type EventInput = Schemas["EventCreateRequest"];
export type CorrectionInput = Schemas["CorrectionRequest"];
export type HistoryParams = Record<string, string | number | undefined>;

/** Representation conversion only: never derive balances or reconstruct postings here. */
export function decimalPaise(value: string): number {
  if (!/^-?(0|[1-9]\d*)\.\d{2}$/.test(value)) throw new Error("Invalid server money format.");
  const integer = BigInt(value.replace(".", ""));
  if (integer > BigInt(Number.MAX_SAFE_INTEGER) || integer < BigInt(Number.MIN_SAFE_INTEGER))
    throw new Error("Server money exceeds safe display precision.");
  return Number(integer);
}

export function accountEntity(account: AccountDTO): AccountEntity {
  return {
    id: account.id,
    name: account.name,
    kind: account.kind,
    openedOn: account.opened_on,
    archived: account.archived,
    createdAt: account.created_at,
    balancePaise: decimalPaise(account.balance),
    openingBalancePaise: decimalPaise(account.opening_balance),
  };
}

export function transactionEntity(
  event: EventDTO,
  accounts: AccountDTO[],
  categories: CategoryDTO[]
): TransactionEntity {
  const accountName = (id: string | null) =>
    accounts.find((a) => a.id === id)?.name ?? (id || "No money account");
  return {
    id: event.id,
    kind: event.kind,
    title: event.title,
    amountPaise: decimalPaise(event.amount),
    effectiveDate: event.effective_date,
    createdAt: event.created_at,
    status: event.status,
    accountId: event.account ?? "",
    accountName: accountName(event.account),
    destinationId: event.destination ?? undefined,
    destinationName: event.destination ? accountName(event.destination) : undefined,
    categoryName:
      categories.find((c) => c.id === event.category)?.name ?? event.category ?? undefined,
    merchant: event.merchant,
    paymentMethod: event.payment_method,
    notes: event.notes,
    raw: event,
  };
}

/** Follow page numbers locally, never a response's absolute next URL. */
export async function allPages<T>(
  path: string,
  signal?: AbortSignal,
  params: HistoryParams = {}
): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 1; ; page++) {
    const result = await apiClient<PaginatedResponse<T>>(path, {
      params: { ...params, page },
      signal,
    });
    rows.push(...result.results);
    if (!result.next) return rows;
  }
}

export const financeApi = {
  accounts: (signal?: AbortSignal) => allPages<AccountDTO>("/api/v1/accounts/", signal),
  account: (id: string, signal?: AbortSignal) =>
    apiClient<AccountDTO>(`/api/v1/accounts/${id}/`, { signal }),
  categories: (signal?: AbortSignal) => allPages<CategoryDTO>("/api/v1/categories/", signal),
  history: (params: HistoryParams, signal?: AbortSignal) =>
    apiClient<PaginatedResponse<EventDTO>>("/api/v1/transactions/", { params, signal }),
  event: (id: string, signal?: AbortSignal) =>
    apiClient<EventDTO>(`/api/v1/transactions/${id}/`, { signal }),
};
