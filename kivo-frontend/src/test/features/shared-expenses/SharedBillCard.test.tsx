import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SharedBillCard } from "@/features/shared-expenses/components/SharedBillCard";
import type { SharedBillEntity } from "@/features/shared-expenses/types";

describe("SharedBillCard", () => {
  const userPaidBill: SharedBillEntity = {
    id: "sb-1",
    title: "Flat Groceries & Cleaning Supplies",
    amountPaise: 300000, // ₹3,000.00
    userSharePaise: 150000, // ₹1,500.00 (friend owes ₹1,500.00)
    category: "Groceries",
    effectiveDate: "2026-10-15",
    payerContactId: null,
    payerName: "You",
    splitMethod: "equal",
    merchant: "SuperMart",
    status: "unsettled",
    shares: [
      {
        contactId: null,
        displayName: "You",
        amountPaise: 150000,
        status: "settled",
      },
      {
        contactId: "c-rohan-1",
        displayName: "Rohan Sharma",
        amountPaise: 150000,
        status: "open",
      },
    ],
    createdAt: "2026-10-15T10:00:00Z",
  };

  const friendPaidBill: SharedBillEntity = {
    id: "sb-2",
    title: "Weekend Team Dinner",
    amountPaise: 400000, // ₹4,000.00
    userSharePaise: 200000, // ₹2,000.00 (user owes friend)
    category: "Dining Out",
    effectiveDate: "2026-10-14",
    payerContactId: "c-priya-2",
    payerName: "Priya Patel",
    splitMethod: "equal",
    status: "all_settled",
    shares: [
      {
        contactId: null,
        displayName: "You",
        amountPaise: 200000,
        status: "settled",
      },
      {
        contactId: "c-priya-2",
        displayName: "Priya Patel",
        amountPaise: 200000,
        status: "settled",
      },
    ],
    createdAt: "2026-10-14T20:00:00Z",
  };

  it("renders title, category, merchant, and split method badge", () => {
    render(<SharedBillCard bill={userPaidBill} />);

    expect(screen.getByText("Flat Groceries & Cleaning Supplies")).toBeInTheDocument();
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("SuperMart")).toBeInTheDocument();
    expect(screen.getByText("equal split")).toBeInTheDocument();
  });

  it("renders correct financial summary when user is payer", () => {
    render(<SharedBillCard bill={userPaidBill} />);

    expect(screen.getByText("Paid by:")).toBeInTheDocument();
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText("₹3,000.00")).toBeInTheDocument(); // Gross
    expect(screen.getByText("₹1,500.00")).toBeInTheDocument(); // User share
    expect(
      screen.getByText("Friends\' outstanding amounts are tracked per claim")
    ).toBeInTheDocument();
    expect(screen.getByText("Unsettled")).toBeInTheDocument();
  });

  it("renders correct financial summary when friend is payer", () => {
    render(<SharedBillCard bill={friendPaidBill} />);

    expect(screen.getByText("Priya Patel")).toBeInTheDocument();
    expect(screen.getByText("₹4,000.00")).toBeInTheDocument();
    expect(screen.getByText("₹2,000.00")).toBeInTheDocument();
    expect(screen.getByText("Payable and settlements are tracked per claim")).toBeInTheDocument();
    expect(screen.getByText("Settled")).toBeInTheDocument();
  });

  it("renders participant count correctly", () => {
    render(<SharedBillCard bill={userPaidBill} />);
    expect(screen.getByText("2 participants")).toBeInTheDocument();
  });
});
