import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BudgetProgress } from "@/features/budgets/components/BudgetProgress";
describe("server budget utilization presentation", () => {
  it.each(["0.00", "79.95", "150.01", "-20.00"])(
    "retains the exact server percentage %s without recomputing spending",
    (value) => {
      render(<BudgetProgress utilization={value} showLabel />);
      expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", value + "%");
      expect(screen.getByText("Utilization: " + value + "%")).toBeVisible();
      const geometry = Math.min(100, Math.max(0, Number(value)));
      expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", String(geometry));
    }
  );
  it("does not manufacture a percentage for a zero limit", () => {
    render(<BudgetProgress utilization={null} showLabel />);
    expect(screen.getByRole("progressbar")).not.toHaveAttribute("aria-valuenow");
    expect(screen.getByText(/Not defined for a zero limit/)).toBeVisible();
  });
});
