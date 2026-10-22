import type {
  RentPlanEntity,
  RentObligationEntity,
  RentReserveEntity,
  ReserveChangeEntity,
  SpendingCapacityEntity,
} from "../types";

export const PREVIEW_RENT_PLAN: RentPlanEntity = {
  id: "plan-indiranagar-3bhk",
  title: "Indiranagar 3BHK Flat Rent",
  payee: "Brigade Residency Management & Landlord",
  startDate: "2026-06-01",
  dueDay: 5, // 5th of each month
  amountPaise: 3000000, // ₹30,000.00 gross monthly rent
  category: "Living Expenses",
  active: true,
  splitMethod: "equal",
  userSharePaise: 1000000, // ₹10,000.00 personal share
  createdAt: "2026-05-20T10:00:00Z",
  shares: [
    {
      contactId: null,
      displayName: "You",
      amountPaise: 1000000,
    },
    {
      contactId: "c-rohan-1",
      displayName: "Rohan Sharma",
      amountPaise: 1000000,
    },
    {
      contactId: "c-ananya-3",
      displayName: "Ananya Iyer",
      amountPaise: 1000000,
    },
  ],
};

export const PREVIEW_RENT_OBLIGATIONS: RentObligationEntity[] = [
  {
    id: "ob-nov-2026",
    planId: "plan-indiranagar-3bhk",
    month: "2026-11-01",
    dueDate: "2026-11-05",
    amountPaise: 3000000, // ₹30,000.00
    paidPaise: 0,
    friendPayablePaise: 0,
    outstandingPaise: 3000000,
    status: "upcoming",
    overdue: false,
    createdAt: "2026-10-15T00:00:00Z",
  },
  {
    id: "ob-oct-2026",
    planId: "plan-indiranagar-3bhk",
    month: "2026-10-01",
    dueDate: "2026-10-05",
    amountPaise: 3000000,
    paidPaise: 3000000,
    friendPayablePaise: 0,
    outstandingPaise: 0,
    status: "paid",
    overdue: false,
    createdAt: "2026-09-15T00:00:00Z",
  },
  {
    id: "ob-sep-2026",
    planId: "plan-indiranagar-3bhk",
    month: "2026-09-01",
    dueDate: "2026-09-05",
    amountPaise: 3000000,
    paidPaise: 3000000,
    friendPayablePaise: 0,
    outstandingPaise: 0,
    status: "paid",
    overdue: false,
    createdAt: "2026-08-15T00:00:00Z",
  },
  {
    id: "ob-aug-2026",
    planId: "plan-indiranagar-3bhk",
    month: "2026-08-01",
    dueDate: "2026-08-05",
    amountPaise: 3000000,
    paidPaise: 3000000,
    friendPayablePaise: 0,
    outstandingPaise: 0,
    status: "paid",
    overdue: false,
    createdAt: "2026-07-15T00:00:00Z",
  },
  {
    id: "ob-jul-2026",
    planId: "plan-indiranagar-3bhk",
    month: "2026-07-01",
    dueDate: "2026-07-05",
    amountPaise: 3000000,
    paidPaise: 0,
    friendPayablePaise: 0,
    outstandingPaise: 3000000,
    status: "skipped",
    overdue: false,
    reason: "Initial security deposit adjustment approved by landlord",
    createdAt: "2026-06-15T00:00:00Z",
  },
];

export const PREVIEW_RENT_RESERVES: RentReserveEntity[] = [
  {
    id: "res-nov-rent",
    obligationId: "ob-nov-2026",
    obligationMonth: "2026-11-01",
    label: "November Rent Earmark",
    reservedPaise: 1000000, // ₹10,000.00
    createdAt: "2026-10-16T14:00:00Z",
  },
  {
    id: "res-flat-maintenance",
    obligationId: "ob-nov-2026",
    obligationMonth: "2026-11-01",
    label: "Society Maintenance Reserve",
    reservedPaise: 200000, // ₹2,000.00
    createdAt: "2026-10-18T10:00:00Z",
  },
];

export const PREVIEW_RESERVE_CHANGES: ReserveChangeEntity[] = [
  {
    id: "chg-1",
    reserveId: "res-nov-rent",
    deltaPaise: 1000000,
    reason: "Earmarked personal share of November rent from October salary",
    active: true,
    createdAt: "2026-10-16T14:00:00Z",
  },
  {
    id: "chg-2",
    reserveId: "res-flat-maintenance",
    deltaPaise: 200000,
    reason: "Protected quarterly building sinking fund contribution",
    active: true,
    createdAt: "2026-10-18T10:00:00Z",
  },
];

export const PREVIEW_SPENDING_CAPACITY: SpendingCapacityEntity = {
  liquidBalancePaise: 4500000, // ₹45,000.00 liquid cash in accounts
  activeReservesPaise: 1200000, // ₹12,000.00 protected rent & maintenance reserves
  safeToSpendPaise: 3300000, // ₹33,000.00 safe to spend
};
