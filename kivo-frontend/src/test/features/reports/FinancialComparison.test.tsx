import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FinancialComparison } from "@/features/reports/components/FinancialComparison";
import { PREVIEW_PERIOD_COMPARISON } from "@/features/reports/data/previewAnalytics";

describe("FinancialComparison", () => {
  it("renders spending reduced state with decrease percentage", () => {
    render(<FinancialComparison comparison={PREVIEW_PERIOD_COMPARISON} />);

    expect(screen.getByText("Cycle-over-Cycle Comparison")).toBeInTheDocument();
    expect(screen.getByText("Spending Reduced")).toBeInTheDocument();
    expect(screen.getByText("(-7.8%)")).toBeInTheDocument();
  });

  it("renders spending increased state when change is positive", () => {
    const increasedComparison = {
      ...PREVIEW_PERIOD_COMPARISON,
      changePaise: 500000,
      changePercent: 10.4,
      trendDirection: "increased" as const,
    };

    render(<FinancialComparison comparison={increasedComparison} />);
    expect(screen.getByText("Spending Increased")).toBeInTheDocument();
    expect(screen.getByText("(+10.4%)")).toBeInTheDocument();
  });
});
