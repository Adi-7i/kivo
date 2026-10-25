import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BudgetStatusBadge } from "@/features/budgets/components/BudgetStatusBadge";
describe("server budget warning state", () => {
  it.each([
    ["ok", "On Track"],
    ["warning", "Approaching Limit (65%+)"],
    ["at_limit", "100% Utilized"],
    ["exceeded", "Over Budget"],
  ] as const)("renders %s without a fixed frontend threshold", (status, label) => {
    render(<BudgetStatusBadge status={status} warningPercent={65} />);
    expect(screen.getByText(label)).toBeVisible();
  });
});
