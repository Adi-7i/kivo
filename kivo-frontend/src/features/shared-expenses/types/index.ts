export type SplitMethod = "equal" | "custom";

export interface ParticipantShare {
  contactId: string | null; // null represents the current user (owner)
  displayName: string;
  amountPaise: number;
  claimId?: string;
  status?: "open" | "partial" | "settled";
}

export interface SharedBillEntity {
  id: string;
  title: string;
  amountPaise: number; // Gross bill total
  category: string;
  effectiveDate: string;
  payerContactId: string | null; // null = User paid; string = friend paid
  payerName: string;
  splitMethod: SplitMethod;
  userSharePaise: number; // User's personal expense share
  shares: ParticipantShare[];
  merchant?: string;
  notes?: string;
  status: "all_settled" | "partially_settled" | "unsettled" | "reversed" | "voided" | "not_verified";
  createdAt: string;
}
