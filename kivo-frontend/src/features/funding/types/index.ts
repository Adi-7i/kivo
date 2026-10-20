/**
 * Funding & Attribution Types
 *
 * Models incoming money batches, FIFO allocations, and fund journey events.
 * Strict financial invariants:
 * - All amounts in integer paise (1 INR = 100 paise; zero floating-point arithmetic).
 * - Original amount = Attributed Spent + Attributed Lent + Remaining Liquid Allocation.
 * - Personal expense (consumption) != Lending (receivable asset).
 * - Attribution exhaustion != zero physical account balance.
 */

export type FundingStatus =
  "active" | "exhausted" | "partially_allocated" | "unresolved" | "corrected";

export type FundEventType =
  | "received"
  | "expense"
  | "lent"
  | "repayment_received"
  | "transfer"
  | "refund"
  | "reversal"
  | "exhausted";

export interface MoneySourceEntity {
  id: string;
  name: string;
  sourcePerson?: string;
  receivedDate: string; // YYYY-MM-DD
  creditedAccountId: string;
  creditedAccountName: string;
  creditedAccountKind: "bank" | "cash" | "wallet";
  originalAmountPaise: number;
  attributedSpentPaise: number;
  attributedLentPaise: number;
  remainingPaise: number;
  status: FundingStatus;
  exhaustionDate?: string; // YYYY-MM-DD when status === "exhausted"
  durationDays?: number; // Calendar days duration when exhausted
  notes?: string;
}

export interface FundJourneyEvent {
  id: string;
  sourceId: string;
  eventType: FundEventType;
  effectiveDate: string; // YYYY-MM-DD
  title: string;
  description: string;
  allocatedAmountPaise: number;
  categoryName?: string;
  accountName?: string;
  targetPerson?: string;
  transactionId?: string; // Links to /transactions/[id]
  attributionState?: "authoritative" | "recalculated" | "unresolved";
}

export interface FundCategoryAttribution {
  categoryName: string;
  amountPaise: number;
  percentage: number;
  color?: string;
}

export interface FundAllocationBreakdown {
  originalAmountPaise: number;
  spentPaise: number;
  spentPercentage: number;
  lentPaise: number;
  lentPercentage: number;
  remainingPaise: number;
  remainingPercentage: number;
  categories: FundCategoryAttribution[];
}

export interface FundingFilterState {
  search: string;
  status: "all" | FundingStatus;
  accountId: string;
  sortBy: "date_desc" | "date_asc" | "amount_desc" | "amount_asc" | "remaining_desc";
}
