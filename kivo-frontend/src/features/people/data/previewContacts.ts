import type { ContactEntity, ContactActivityEvent } from "../types";

export const PREVIEW_CONTACTS: ContactEntity[] = [
  {
    id: "c-rohan-1",
    displayName: "Rohan Sharma",
    notes: "Flatmate at Indiranagar Apt 4B. Handles electricity bills.",
    isRoommate: true,
    archived: false,
    createdAt: "2026-08-15T10:00:00Z",
    receivablePaise: 450000, // ₹4,500.00 owed to user
    payablePaise: 0,
  },
  {
    id: "c-priya-2",
    displayName: "Priya Patel",
    notes: "College friend. Borrowed cash during airport transit.",
    isRoommate: false,
    archived: false,
    createdAt: "2026-09-01T14:30:00Z",
    receivablePaise: 0,
    payablePaise: 120000, // ₹1,200.00 owed by user to Priya
  },
  {
    id: "c-ananya-3",
    displayName: "Ananya Iyer",
    notes: "Flatmate at Indiranagar Apt 4B. Split Wi-Fi and groceries.",
    isRoommate: true,
    archived: false,
    createdAt: "2026-08-20T11:15:00Z",
    receivablePaise: 215000, // ₹2,150.00 owed to user
    payablePaise: 50000, // ₹500.00 owed by user
  },
  {
    id: "c-vikram-4",
    displayName: "Vikram Malhotra",
    notes: "Tech lead & friend. Weekend cricket and group dinners.",
    isRoommate: false,
    archived: false,
    createdAt: "2026-07-10T09:00:00Z",
    receivablePaise: 0,
    payablePaise: 0, // Fully settled
  },
  {
    id: "c-kavita-5",
    displayName: "Kavita Rao",
    notes: "Former flatmate from HSR layout. Account settled.",
    isRoommate: false,
    archived: true,
    createdAt: "2026-05-04T12:00:00Z",
    receivablePaise: 0,
    payablePaise: 0,
  },
];

export const PREVIEW_CONTACT_ACTIVITIES: Record<string, ContactActivityEvent[]> = {
  "c-rohan-1": [
    {
      id: "act-1",
      type: "shared_bill_paid_by_user",
      title: "Indiranagar Flat October Groceries",
      date: "2026-10-14",
      amountPaise: 600000, // ₹6,000.00 total bill
      contactSharePaise: 300000, // ₹3,000.00 Rohan's share
      notes: "Nature's Basket monthly grocery order",
      status: "open",
    },
    {
      id: "act-2",
      type: "loan_lent",
      title: "Advance for plumber & water filter maintenance",
      date: "2026-10-08",
      amountPaise: 150000, // ₹1,500.00
      notes: "Cash advance given for building plumber",
      status: "open",
    },
    {
      id: "act-3",
      type: "repayment_received",
      title: "Repayment for September Wi-Fi share",
      date: "2026-09-28",
      amountPaise: 125000, // ₹1,250.00
      notes: "UPI payment received via HDFC",
      status: "settled",
    },
  ],
  "c-priya-2": [
    {
      id: "act-4",
      type: "loan_borrowed",
      title: "Emergency airport cab fare assistance",
      date: "2026-10-10",
      amountPaise: 120000, // ₹1,200.00
      notes: "Priya paid directly via Uber when UPI server was down",
      status: "open",
    },
  ],
  "c-ananya-3": [
    {
      id: "act-5",
      type: "shared_bill_paid_by_user",
      title: "Fiber Internet Bill (ACT Fibernet 300Mbps)",
      date: "2026-10-05",
      amountPaise: 165000,
      contactSharePaise: 55000,
      notes: "Shared among 3 flatmates",
      status: "open",
    },
    {
      id: "act-6",
      type: "loan_lent",
      title: "Concert tickets booking advance",
      date: "2026-09-22",
      amountPaise: 160000,
      notes: "BookMyShow pass booking",
      status: "open",
    },
    {
      id: "act-7",
      type: "shared_bill_paid_by_friend",
      title: "Cook's monthly ration purchase",
      date: "2026-09-15",
      amountPaise: 150000,
      contactSharePaise: 50000, // User owes Ananya ₹500
      notes: "Ananya paid at local store",
      status: "open",
    },
  ],
  "c-vikram-4": [
    {
      id: "act-8",
      type: "loan_lent",
      title: "Team lunch split advance",
      date: "2026-08-14",
      amountPaise: 240000,
      status: "settled",
    },
    {
      id: "act-9",
      type: "repayment_received",
      title: "Settlement for team lunch",
      date: "2026-08-16",
      amountPaise: 240000,
      status: "settled",
    },
  ],
  "c-kavita-5": [],
};
