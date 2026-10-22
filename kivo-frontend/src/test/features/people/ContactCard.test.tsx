import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContactCard } from "@/features/people/components/ContactCard";
import type { ContactEntity } from "@/features/people/types";

describe("ContactCard", () => {
  const mockContact: ContactEntity = {
    id: "c-test-1",
    displayName: "Rohan Sharma",
    notes: "Flatmate Apt 4B",
    isRoommate: true,
    archived: false,
    createdAt: "2026-10-01T00:00:00Z",
    receivablePaise: 450000, // ₹4,500.00 owed to user
    payablePaise: 0,
  };

  it("renders contact name, notes, and roommate badge", () => {
    render(<ContactCard contact={mockContact} />);
    expect(screen.getByText("Rohan Sharma")).toBeInTheDocument();
    expect(screen.getByText("Flatmate Apt 4B")).toBeInTheDocument();
    expect(screen.getByText("Roommate")).toBeInTheDocument();
  });

  it("renders receivable amount correctly when contact owes user", () => {
    render(<ContactCard contact={mockContact} />);
    expect(screen.getByText("Owes you")).toBeInTheDocument();
    expect(screen.getByText("₹4,500.00")).toBeInTheDocument();
  });

  it("renders payable amount correctly when user owes contact", () => {
    const payableContact: ContactEntity = {
      ...mockContact,
      receivablePaise: 0,
      payablePaise: 120000, // ₹1,200.00
    };
    render(<ContactCard contact={payableContact} />);
    expect(screen.getByText("You owe")).toBeInTheDocument();
    expect(screen.getByText("₹1,200.00")).toBeInTheDocument();
  });

  it("renders all settled message when balances are zero", () => {
    const settledContact: ContactEntity = {
      ...mockContact,
      receivablePaise: 0,
      payablePaise: 0,
    };
    render(<ContactCard contact={settledContact} />);
    expect(screen.getByText("All settled up")).toBeInTheDocument();
  });
});
