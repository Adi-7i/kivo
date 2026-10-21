import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SafeToSpendCard } from "@/features/rent/components/SafeToSpendCard";
import type { SpendingCapacityEntity } from "@/features/rent/types";

describe("SafeToSpendCard", () => {
  const healthyCapacity: SpendingCapacityEntity = {
    liquidBalancePaise: 9245000, // ₹92,450.00
    activeReservesPaise: 1400000, // ₹14,000.00
    safeToSpendPaise: 7845000, // ₹78,450.00
  };

  const shortfallCapacity: SpendingCapacityEntity = {
    liquidBalancePaise: 1000000, // ₹10,000.00
    activeReservesPaise: 1400000, // ₹14,000.00
    safeToSpendPaise: -400000, // -₹4,000.00 (shortfall)
  };

  it("renders healthy liquid cash, active reserves and positive safe-to-spend", () => {
    render(<SafeToSpendCard capacity={healthyCapacity} />);

    expect(screen.getByText("Spending Capacity & Safe-to-Spend")).toBeInTheDocument();
    expect(screen.getByText("Actual Liquid Cash")).toBeInTheDocument();
    expect(screen.getByText("₹92,450.00")).toBeInTheDocument();
    expect(screen.getByText("Active Rent Reserves")).toBeInTheDocument();
    expect(screen.getByText("₹14,000.00")).toBeInTheDocument();
    expect(screen.getByText("Safe-to-Spend")).toBeInTheDocument();
    expect(screen.getByText("₹78,450.00")).toBeInTheDocument();
    expect(
      screen.getByText("Liquid cash safely disposable for discretionary spending")
    ).toBeInTheDocument();
  });

  it("renders shortfall alert when active reserves exceed liquid cash", () => {
    render(<SafeToSpendCard capacity={shortfallCapacity} />);

    expect(
      screen.getByText("Shortfall: Reserves exceed current liquid balance")
    ).toBeInTheDocument();
    // Negative format -₹4,000.00
    expect(screen.getByText("-₹4,000.00")).toBeInTheDocument();
  });

  it("triggers onAddReserve callback when add button is clicked", () => {
    const handleAdd = vi.fn();
    render(<SafeToSpendCard capacity={healthyCapacity} onAddReserve={handleAdd} />);

    const btn = screen.getByRole("button", { name: /Add Reserve Earmark/i });
    fireEvent.click(btn);

    expect(handleAdd).toHaveBeenCalledTimes(1);
  });
});
