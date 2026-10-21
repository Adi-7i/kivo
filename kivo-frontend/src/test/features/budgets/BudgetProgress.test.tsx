import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BudgetProgress, getBudgetStatus } from "@/features/budgets/components/BudgetProgress";

describe("getBudgetStatus helper", () => {
  it("returns normal when spending is under 80%", () => {
    expect(getBudgetStatus(500000, 1000000)).toBe("normal");
    expect(getBudgetStatus(790000, 1000000)).toBe("normal");
  });

  it("returns warning when spending is between 80% and 99.9%", () => {
    expect(getBudgetStatus(800000, 1000000)).toBe("warning");
    expect(getBudgetStatus(950000, 1000000)).toBe("warning");
  });

  it("returns full when spending is exactly 100%", () => {
    expect(getBudgetStatus(1000000, 1000000)).toBe("full");
  });

  it("returns exceeded when spending is over 100%", () => {
    expect(getBudgetStatus(1050000, 1000000)).toBe("exceeded");
  });
});

describe("BudgetProgress component", () => {
  it("renders progressbar with aria attributes", () => {
    render(<BudgetProgress spentPaise={600000} limitPaise={1000000} showLabel />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveAttribute("aria-valuenow", "60");
    expect(screen.getByText("60%")).toBeInTheDocument();
  });
});
