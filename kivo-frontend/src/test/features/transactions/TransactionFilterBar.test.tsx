import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransactionFilterBar } from "@/features/transactions/components/TransactionFilterBar";
import type { TransactionFilterState } from "@/features/transactions/types";

const mockFilters: TransactionFilterState = {
  search: "",
  kind: "all",
  accountId: "all",
  categoryName: "all",
  datePreset: "this_month",
  sortBy: "date_desc",
};

describe("TransactionFilterBar component", () => {
  it("renders search input, filter dropdowns, and kind pills", () => {
    render(
      <TransactionFilterBar
        filters={mockFilters}
        onFilterChange={vi.fn()}
        onReset={vi.fn()}
        accounts={[{ id: "acc-1", name: "HDFC", kind: "bank", balancePaise: 1000, openingBalancePaise: 0, openedOn: "2026-01-01", archived: false, createdAt: "" }]}
        categories={["Food", "Utilities"]}
      />
    );

    expect(screen.getByPlaceholderText(/Search title, merchant, notes/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All Types" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "expense" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "receipt" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "transfer" })).toBeInTheDocument();
  });

  it("calls onFilterChange when a kind pill is clicked", async () => {
    const user = userEvent.setup();
    const handleFilterChange = vi.fn();

    render(
      <TransactionFilterBar
        filters={mockFilters}
        onFilterChange={handleFilterChange}
        onReset={vi.fn()}
        accounts={[]}
        categories={[]}
      />
    );

    await user.click(screen.getByRole("button", { name: "expense" }));
    expect(handleFilterChange).toHaveBeenCalledWith({ kind: "expense" });
  });

  it("shows reset button when active filters exist", async () => {
    const user = userEvent.setup();
    const handleReset = vi.fn();

    render(
      <TransactionFilterBar
        filters={{ ...mockFilters, search: "groceries" }}
        onFilterChange={vi.fn()}
        onReset={handleReset}
        accounts={[]}
        categories={[]}
      />
    );

    const resetBtn = screen.getByRole("button", { name: /Reset Filters/i });
    expect(resetBtn).toBeInTheDocument();
    await user.click(resetBtn);
    expect(handleReset).toHaveBeenCalledTimes(1);
  });
});
