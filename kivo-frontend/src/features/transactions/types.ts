import type { AccountKind } from "../accounts/types";
import type { EventDTO } from "@/features/finance/api";

export type TransactionKind = EventDTO["kind"];

export type TransactionStatus = "posted" | "reversed" | "voided" | "reversal";

export interface TransactionPosting {
  accountName: string;
  accountKind: AccountKind;
  direction: "debit" | "credit";
  amountPaise: number;
}

export interface TransactionEntity {
  raw?: EventDTO;
  id: string;
  kind: TransactionKind;
  title: string;
  amountPaise: number;
  effectiveDate: string; // YYYY-MM-DD
  createdAt: string; // ISO Datetime
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
  | "all"
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
  contact?: string;
  merchant?: string;
  paymentMethod?: string;
  amountMin?: string;
  amountMax?: string;
  destination?: string;
}

export const TRANSACTION_KIND_LABELS: Record<TransactionKind, string> = {
  expense: "Personal Expense",
  receipt: "Money Received",
  transfer: "Own Transfer",
  opening: "Opening Balance",
  refund: "Expense Refund",
  reversal: "Reversal",
  lend: "Money Lent",
  borrow: "Money Borrowed",
  repay_in: "Repayment Received",
  repay_out: "Repayment Paid",
  shared_paid: "Shared Bill Paid",
  shared_due: "Shared Bill Due",
};
