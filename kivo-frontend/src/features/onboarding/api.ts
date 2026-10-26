import { apiClient } from "@/lib/api/client";
import type { PaginatedResponse } from "@/types/api";
import type { AccountType } from "./types";

export const ACCOUNT_SETUP_STALE_MS = 30_000;

export interface MoneyAccount {
  id: string;
  name: string;
  kind: AccountType;
  opened_on: string;
  archived: boolean;
  created_at: string;
  balance: string;
  opening_balance: string;
}

export interface CreateAccountInput {
  name: string;
  kind: AccountType;
  opened_on: string;
  opening_balance: string;
}

export function listAccounts(signal?: AbortSignal): Promise<PaginatedResponse<MoneyAccount>> {
  return apiClient("/api/v1/accounts/", { signal });
}

export function createInitialAccount(body: CreateAccountInput, key: string): Promise<MoneyAccount> {
  return apiClient("/api/v1/accounts/", { method: "POST", body, idempotencyKey: key });
}
