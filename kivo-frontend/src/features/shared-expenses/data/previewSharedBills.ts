import type { SharedBillEntity } from "../types";

export const PREVIEW_SHARED_BILLS: SharedBillEntity[] = [
  {
    id: "bill-groceries-oct",
    title: "Nature's Basket Flat Groceries",
    amountPaise: 600000, // ₹6,000.00
    category: "Food & Groceries",
    effectiveDate: "2026-10-14",
    payerContactId: null, // User paid
    payerName: "You",
    splitMethod: "equal",
    userSharePaise: 300000, // ₹3,000.00 personal expense
    merchant: "Nature's Basket Indiranagar",
    notes: "Monthly staples, pantry items, olive oil and dairy",
    status: "unsettled",
    createdAt: "2026-10-14T18:30:00Z",
    shares: [
      {
        contactId: null,
        displayName: "You",
        amountPaise: 300000,
        status: "settled",
      },
      {
        contactId: "c-rohan-1",
        displayName: "Rohan Sharma",
        amountPaise: 300000,
        claimId: "claim-rohan-groceries",
        status: "open",
      },
    ],
  },
  {
    id: "bill-act-fiber-oct",
    title: "ACT Fibernet 300Mbps Broadband",
    amountPaise: 165000, // ₹1,650.00
    category: "Utilities & Bills",
    effectiveDate: "2026-10-05",
    payerContactId: null, // User paid
    payerName: "You",
    splitMethod: "equal",
    userSharePaise: 55000, // ₹550.00 personal expense
    merchant: "ACT Fibernet Bangalore",
    notes: "High speed fiber broadband for Apt 4B",
    status: "unsettled",
    createdAt: "2026-10-05T12:00:00Z",
    shares: [
      {
        contactId: null,
        displayName: "You",
        amountPaise: 55000,
        status: "settled",
      },
      {
        contactId: "c-rohan-1",
        displayName: "Rohan Sharma",
        amountPaise: 55000,
        status: "open",
      },
      {
        contactId: "c-ananya-3",
        displayName: "Ananya Iyer",
        amountPaise: 55000,
        claimId: "claim-ananya-wifi",
        status: "open",
      },
    ],
  },
  {
    id: "bill-weekend-dinner",
    title: "Bangalore Club Weekend Dinner",
    amountPaise: 480000, // ₹4,800.00
    category: "Living Expenses",
    effectiveDate: "2026-10-12",
    payerContactId: "c-vikram-4",
    payerName: "Vikram Malhotra",
    splitMethod: "custom",
    userSharePaise: 120000, // ₹1,200.00 personal expense & payable
    merchant: "The Bangalore Club",
    notes: "Vikram settled the table bill directly",
    status: "partially_settled",
    createdAt: "2026-10-12T21:45:00Z",
    shares: [
      {
        contactId: null,
        displayName: "You",
        amountPaise: 120000,
        status: "open",
      },
      {
        contactId: "c-rohan-1",
        displayName: "Rohan Sharma",
        amountPaise: 180000,
        status: "settled",
      },
      {
        contactId: "c-vikram-4",
        displayName: "Vikram Malhotra",
        amountPaise: 180000,
        status: "settled",
      },
    ],
  },
  {
    id: "bill-cook-ration",
    title: "House Cook Monthly Ration",
    amountPaise: 150000, // ₹1,500.00
    category: "Food & Groceries",
    effectiveDate: "2026-09-15",
    payerContactId: "c-ananya-3",
    payerName: "Ananya Iyer",
    splitMethod: "equal",
    userSharePaise: 50000, // ₹500.00 personal expense & payable
    notes: "Spices and provisions for house cook",
    status: "unsettled",
    createdAt: "2026-09-15T19:00:00Z",
    shares: [
      {
        contactId: null,
        displayName: "You",
        amountPaise: 50000,
        status: "open",
      },
      {
        contactId: "c-rohan-1",
        displayName: "Rohan Sharma",
        amountPaise: 50000,
        status: "open",
      },
      {
        contactId: "c-ananya-3",
        displayName: "Ananya Iyer",
        amountPaise: 50000,
        status: "settled",
      },
    ],
  },
  {
    id: "bill-toit-lunch",
    title: "Team Lunch at Toit",
    amountPaise: 480000, // ₹4,800.00
    category: "Food & Groceries",
    effectiveDate: "2026-08-14",
    payerContactId: null,
    payerName: "You",
    splitMethod: "equal",
    userSharePaise: 240000,
    status: "all_settled",
    createdAt: "2026-08-14T13:00:00Z",
    shares: [
      {
        contactId: null,
        displayName: "You",
        amountPaise: 240000,
        status: "settled",
      },
      {
        contactId: "c-vikram-4",
        displayName: "Vikram Malhotra",
        amountPaise: 240000,
        claimId: "claim-vikram-lunch",
        status: "settled",
      },
    ],
  },
];
