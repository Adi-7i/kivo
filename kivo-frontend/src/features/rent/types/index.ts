export type RentObligationStatus = "upcoming" | "due" | "partial" | "paid" | "overdue" | "skipped";

export interface RentShareEntity {
  contactId: string | null;
  displayName: string;
  amountPaise: number;
}

export interface RentPlanEntity {
  id: string;
  title: string;
  payee: string;
  startDate: string;
  dueDay: number | null; // null represents last day of month
  amountPaise: number; // Gross monthly landlord rent
  category: string;
  active: boolean;
  splitMethod?: "equal" | "custom";
  shares: RentShareEntity[];
  userSharePaise: number;
  createdAt: string;
}

export interface RentObligationEntity {
  id: string;
  planId: string;
  month: string; // YYYY-MM-01
  dueDate: string; // YYYY-MM-DD
  amountPaise: number; // Gross amount
  paidPaise: number;
  friendPayablePaise: number; // Amount friend paid to landlord on user's behalf
  outstandingPaise: number;
  status: RentObligationStatus;
  overdue: boolean;
  reason?: string;
  createdAt: string;
}

export interface RentPaymentEntity {
  id: string;
  obligationId: string;
  amountPaise: number;
  effectiveDate: string;
  payerType: "owner" | "friend";
  payerName: string;
  accountId?: string;
  notes?: string;
  createdAt: string;
}

export interface RentReserveEntity {
  id: string;
  obligationId: string;
  obligationMonth?: string;
  label: string;
  reservedPaise: number;
  createdAt: string;
}

export interface ReserveChangeEntity {
  id: string;
  reserveId: string;
  deltaPaise: number;
  reason: string;
  paymentId?: string;
  settlementId?: string;
  active: boolean;
  createdAt: string;
}

export interface SpendingCapacityEntity {
  liquidBalancePaise: number;
  activeReservesPaise: number;
  safeToSpendPaise: number;
}
