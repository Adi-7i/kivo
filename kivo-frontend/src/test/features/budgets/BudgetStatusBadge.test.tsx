import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BudgetStatusBadge } from "@/features/budgets/components/BudgetStatusBadge";

describe("BudgetStatusBadge", () => {
  it("renders On Track badge for normal status", () => {
    render(<BudgetStatusBadge status="normal" />);
    expect(screen.getByText("On Track")).toBeInTheDocument();
  });

  it("renders Approaching Limit badge for warning status", () => {
    render(<BudgetStatusBadge status="warning" />);
    expect(screen.getByText(/Approaching Limit/i)).toBeInTheDocument();
  });

  it("renders 100% Utilized badge for full status", () => {
    render(<BudgetStatusBadge status="full" />);
    expect(screen.getByText("100% Utilized")).toBeInTheDocument();
  });

  it("renders Over Budget badge for exceeded status", () => {
    render(<BudgetStatusBadge status="exceeded" />);
    expect(screen.getByText("Over Budget")).toBeInTheDocument();
  });
});
