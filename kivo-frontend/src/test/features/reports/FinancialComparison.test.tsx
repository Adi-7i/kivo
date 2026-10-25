import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FinancialComparison } from "@/features/reports/components/FinancialComparison";
import { summary } from "./fixtures";
describe("server period comparison", () => {
  it("renders the exact authoritative percentage", () => {
    render(<FinancialComparison summary={summary} />);
    expect(screen.getByTestId("report-comparison")).toHaveTextContent("-50.00%");
  });
  it("does not infer a percentage for an incomplete/nonpositive comparison", () => {
    render(
      <FinancialComparison
        summary={{
          ...summary,
          comparison: { ...summary.comparison!, comparable: false, percentage_difference: null },
        }}
      />
    );
    expect(screen.getByText(/Percentage comparison is unavailable/)).toBeVisible();
    expect(screen.queryByTestId("report-comparison")).not.toBeInTheDocument();
  });
  it("represents an uncomputable historical range honestly", () => {
    render(<FinancialComparison summary={{ ...summary, comparison: null }} />);
    expect(screen.getByText(/Comparison is unavailable/)).toBeVisible();
  });
});
