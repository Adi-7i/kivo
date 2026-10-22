export interface ContactEntity {
  id: string;
  displayName: string;
  notes?: string;
  isRoommate: boolean;
  archived: boolean;
  createdAt: string;
  receivablePaise: number; // Money owed TO user by this contact
  payablePaise: number; // Money owed BY user to this contact
}

export type FinancialRelationshipType = "receivable" | "payable" | "settled" | "neutral";

export interface ContactActivityEvent {
  id: string;
  type:
    | "loan_lent"
    | "loan_borrowed"
    | "repayment_received"
    | "repayment_paid"
    | "shared_bill_paid_by_user"
    | "shared_bill_paid_by_friend";
  title: string;
  date: string;
  amountPaise: number;
  contactSharePaise?: number;
  notes?: string;
  status: "open" | "partial" | "settled" | "cancelled";
}
