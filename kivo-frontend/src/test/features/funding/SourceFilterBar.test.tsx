import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SourceFilterBar } from "@/features/funding/components/SourceFilterBar";
import type { FundingFilterState } from "@/features/funding/types";

const defaultFilters: FundingFilterState = {
  search: "",
  status: "all",
  accountId: "all",
  sortBy: "date_desc",
};

describe("SourceFilterBar", () => {
  it("renders search input, status options, and sort selector", () => {
    render(<SourceFilterBar filters={defaultFilters} onFilterChange={vi.fn()} onReset={vi.fn()} />);

    expect(screen.getByPlaceholderText(/Search source name, person, notes/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All Sources" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Active" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exhausted" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /Sort money sources/i })).toBeInTheDocument();
  });

  it("calls onFilterChange when user types in search input", async () => {
    const user = userEvent.setup();
    const handleFilterChange = vi.fn();

    render(
      <SourceFilterBar
        filters={defaultFilters}
        onFilterChange={handleFilterChange}
        onReset={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search source name, person, notes/i);
    await user.type(searchInput, "Allowance");

    expect(handleFilterChange).toHaveBeenCalled();
  });

  it("calls onFilterChange when a status pill is clicked", async () => {
    const user = userEvent.setup();
    const handleFilterChange = vi.fn();

    render(
      <SourceFilterBar
        filters={defaultFilters}
        onFilterChange={handleFilterChange}
        onReset={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Exhausted" }));

    expect(handleFilterChange).toHaveBeenCalledWith({ status: "exhausted" });
  });

  it("shows Reset button when filters are active and calls onReset when clicked", async () => {
    const user = userEvent.setup();
    const handleReset = vi.fn();

    const activeFilters: FundingFilterState = {
      search: "Freelance",
      status: "exhausted",
      accountId: "all",
      sortBy: "date_desc",
    };

    render(
      <SourceFilterBar filters={activeFilters} onFilterChange={vi.fn()} onReset={handleReset} />
    );

    const resetBtn = screen.getByRole("button", { name: /Reset/i });
    expect(resetBtn).toBeInTheDocument();

    await user.click(resetBtn);
    expect(handleReset).toHaveBeenCalledTimes(1);
  });
});
