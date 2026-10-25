import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnalyticsSummaryCard } from "@/features/reports/components/AnalyticsSummaryCard";
import { summary } from "./fixtures";
describe("authoritative report summary", () => {
  it("keeps external income, cash receipts and expenses distinct", () => {
    render(<AnalyticsSummaryCard summary={summary} />);
    expect(screen.getByTestId("report-expense")).toHaveTextContent("₹1.25");
    expect(screen.getByTestId("report-income")).toHaveTextContent("₹3.00");
    expect(screen.getByTestId("report-cash-received")).toHaveTextContent("₹7.00");
    expect(screen.getByTestId("report-cash-paid")).toHaveTextContent("₹4.50");
    expect(screen.getByTestId("report-average")).toHaveTextContent("₹0.04");
    expect(screen.queryByText("Net Cash Flow")).not.toBeInTheDocument();
  });
  it("does not invent a peak day or average when missing", () => {
    render(
      <AnalyticsSummaryCard
        summary={{ ...summary, highest_spending_day: null, average_daily_expense: null }}
      />
    );
    expect(screen.getByTestId("report-peak")).toHaveTextContent("Not computed");
    expect(screen.getByTestId("report-average")).toHaveTextContent("Not computed");
  });
});
