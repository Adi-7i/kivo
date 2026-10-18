import type { AccountKind } from "../accounts/types";

export type TransactionKind =
  | "expense"
  | "receipt"
  | "transfer"
  | "opening"
  | "refund"
  | "reversal";

export type TransactionStatus = "posted" | "reversed" | "voided" | "reversal";

export interface TransactionPosting {
  accountName: string;
  accountKind: AccountKind;
  direction: "debit" | "credit";
  amountPaise: number;
}

export interface TransactionEntity {
  id: string;
  kind: TransactionKind;
  title: string;
  amountPaise: number;
  effectiveDate: string; // YYYY-MM-DD
  createdAt: string;     // ISO Datetime
  status: TransactionStatus;
  accountId: string;
  accountName: string;
  destinationId?: string;
  destinationName?: string;
  categoryName?: string;
  merchant?: string;
  paymentMethod?: string;
  notes?: string;
  postings?: TransactionPosting[];
}

export type DatePreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_7_days"
  | "this_month"
  | "previous_month"
  | "this_year"
  | "custom";

export interface TransactionFilterState {
  search: string;
  kind: TransactionKind | "all";
  accountId: string | "all";
  categoryName: string | "all";
  datePreset: DatePreset;
  startDate?: string;
  endDate?: string;
  sortBy: "date_desc" | "date_asc" | "amount_desc" | "amount_asc";
}

export const TRANSACTION_KIND_LABELS: Record<TransactionKind, string> = {
  expense: "Personal Expense",
  receipt: "Money Received",
  transfer: "Own Transfer",
  opening: "Opening Balance",
  refund: "Expense Refund",
  reversal: "Reversal",
};
