export type LoanKind = "lend" | "borrow";
export type ClaimDirection = "receivable" | "payable";
export type ClaimStatus = "open" | "partial" | "settled" | "cancelled";

export interface ClaimEntity {
  id: string;
  contactId: string;
  contactName: string;
  direction: ClaimDirection;
  title: string;
  principalPaise: number;
  outstandingPaise: number;
  status: ClaimStatus;
  createdAt: string;
  effectiveDate?: string;
  sourceEventId?: string;
  notes?: string;
}

export interface LoanTransaction {
  id: string;
  kind: LoanKind;
  contactId: string;
  contactName: string;
  accountId: string;
  accountName: string;
  amountPaise: number;
  effectiveDate: string;
  title: string;
  notes?: string;
  paymentMethod?: string;
  createdAt: string;
}
