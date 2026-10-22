import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FundOverviewCard } from "@/features/funding/components/FundOverviewCard";
import type { MoneySourceEntity } from "@/features/funding/types";

const mockActiveSource: MoneySourceEntity = {
  id: "src-1",
  name: "October Allowance from Parents",
  sourcePerson: "Parents",
  receivedDate: "2026-10-01",
  creditedAccountId: "acc-1",
  creditedAccountName: "HDFC Salary Account",
  creditedAccountKind: "bank",
  originalAmountPaise: 5000000, // ₹50,000.00
  attributedSpentPaise: 2980000, // ₹29,800.00
  attributedLentPaise: 500000, // ₹5,000.00
  remainingPaise: 1520000, // ₹15,200.00
  status: "active",
};

const mockExhaustedSource: MoneySourceEntity = {
  id: "src-2",
  name: "September Freelance Retainer",
  sourcePerson: "Acme Studio",
  receivedDate: "2026-09-05",
  creditedAccountId: "acc-1",
  creditedAccountName: "HDFC Salary Account",
  creditedAccountKind: "bank",
  originalAmountPaise: 3500000,
  attributedSpentPaise: 3500000,
  attributedLentPaise: 0,
  remainingPaise: 0,
  status: "exhausted",
  exhaustionDate: "2026-09-29",
  durationDays: 24,
};

describe("FundOverviewCard", () => {
  it("renders active source metrics with clear spending vs lending distinction", () => {
    render(<FundOverviewCard source={mockActiveSource} />);

    expect(screen.getByText("October Allowance from Parents")).toBeInTheDocument();
    expect(screen.getByText(/Received from: Parents/i)).toBeInTheDocument();
    expect(screen.getByText(/HDFC Salary Account/i)).toBeInTheDocument();

    // Check 4 financial concepts
    expect(screen.getByText("Original Inflow Amount")).toBeInTheDocument();
    expect(screen.getByText("Personal Expenses")).toBeInTheDocument();
    expect(screen.getByText("Lent to Friends (Asset)")).toBeInTheDocument();
    expect(screen.getByText("Remaining Liquid Allocation")).toBeInTheDocument();

    // Verify invariant notice
    expect(screen.getByText(/Spending ≠ Lending ≠ Remaining Funds/i)).toBeInTheDocument();
  });

  it("renders exhausted source with duration and exhaustion banner", () => {
    render(<FundOverviewCard source={mockExhaustedSource} />);

    expect(screen.getByText("September Freelance Retainer")).toBeInTheDocument();
    expect(screen.getByText("Funding Batch Fully Exhausted")).toBeInTheDocument();
    expect(screen.getByText(/Lasted 24 calendar days/i)).toBeInTheDocument();
  });
});
