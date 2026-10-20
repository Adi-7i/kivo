import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FundJourneyTimeline } from "@/features/funding/components/FundJourneyTimeline";
import type { FundJourneyEvent } from "@/features/funding/types";

const mockEvents: FundJourneyEvent[] = [
  {
    id: "ev-1",
    sourceId: "src-1",
    eventType: "received",
    effectiveDate: "2026-10-01",
    title: "Funds Inflow Established",
    description: "Received ₹50,000 allowance from Parents into HDFC.",
    allocatedAmountPaise: 5000000,
  },
  {
    id: "ev-2",
    sourceId: "src-1",
    eventType: "expense",
    effectiveDate: "2026-10-02",
    title: "House Rent",
    description: "October shared apartment rent.",
    allocatedAmountPaise: 1800000,
    categoryName: "Housing & Rent",
  },
  {
    id: "ev-3",
    sourceId: "src-1",
    eventType: "lent",
    effectiveDate: "2026-10-06",
    title: "Loan to Aditya",
    description: "Lent ₹5,000 for hospital deposit.",
    allocatedAmountPaise: 500000,
    targetPerson: "Aditya",
  },
];

describe("FundJourneyTimeline", () => {
  it("renders all chronological events with distinctive labels", () => {
    render(<FundJourneyTimeline events={mockEvents} />);

    expect(screen.getByText("Visual Fund Journey")).toBeInTheDocument();
    expect(screen.getByText("Funds Inflow Established")).toBeInTheDocument();
    expect(screen.getByText("House Rent")).toBeInTheDocument();
    expect(screen.getByText("Loan to Aditya")).toBeInTheDocument();

    expect(screen.getByText("Money Inflow")).toBeInTheDocument();
    expect(screen.getByText("Personal Expense")).toBeInTheDocument();
    expect(screen.getByText("Lent to Friend (Asset)")).toBeInTheDocument();
  });

  it("filters events when filter pills are clicked", async () => {
    const user = userEvent.setup();
    render(<FundJourneyTimeline events={mockEvents} />);

    // Click Expenses filter
    await user.click(screen.getByRole("button", { name: "Expenses" }));
    expect(screen.getByText("House Rent")).toBeInTheDocument();
    expect(screen.queryByText("Loan to Aditya")).not.toBeInTheDocument();

    // Click Lending filter
    await user.click(screen.getByRole("button", { name: "Lending" }));
    expect(screen.getByText("Loan to Aditya")).toBeInTheDocument();
    expect(screen.queryByText("House Rent")).not.toBeInTheDocument();
  });

  it("renders empty state when events list is empty", () => {
    render(<FundJourneyTimeline events={[]} />);
    expect(screen.getByText("No Journey Events Recorded")).toBeInTheDocument();
  });
});
