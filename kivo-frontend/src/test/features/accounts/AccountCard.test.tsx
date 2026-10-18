import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccountCard } from "@/features/accounts/components/AccountCard";
import type { AccountEntity } from "@/features/accounts/types";

const mockAccount: AccountEntity = {
  id: "acc-1",
  name: "State Bank of India",
  kind: "bank",
  balancePaise: 1500000,
  openingBalancePaise: 500000,
  openedOn: "2026-01-10",
  archived: false,
  createdAt: "2026-01-10T10:00:00Z",
};

describe("AccountCard component", () => {
  it("renders account details, kind badge, and formatted balance", () => {
    render(<AccountCard account={mockAccount} />);

    expect(screen.getByText("State Bank of India")).toBeInTheDocument();
    expect(screen.getByText("bank")).toBeInTheDocument();
    expect(screen.getByText("₹15,000.00")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View activity/i })).toHaveAttribute(
      "href",
      "/transactions?accountId=acc-1"
    );
  });

  it("triggers onEdit callback when edit button is clicked", async () => {
    const user = userEvent.setup();
    const handleEdit = vi.fn();
    render(<AccountCard account={mockAccount} onEdit={handleEdit} />);

    const editBtn = screen.getByRole("button", { name: /Edit/i });
    await user.click(editBtn);

    expect(handleEdit).toHaveBeenCalledTimes(1);
    expect(handleEdit).toHaveBeenCalledWith(mockAccount);
  });
});
