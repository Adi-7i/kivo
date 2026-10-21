import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnalyticsSummaryCard } from "@/features/reports/components/AnalyticsSummaryCard";
import { PREVIEW_ANALYTICS_SUMMARY } from "@/features/reports/data/previewAnalytics";

describe("AnalyticsSummaryCard", () => {
  it("renders all 6 financial KPI titles and metrics", () => {
    render(<AnalyticsSummaryCard summary={PREVIEW_ANALYTICS_SUMMARY} />);

    expect(screen.getByText("Personal Expenses")).toBeInTheDocument();
    expect(screen.getByText("Eligible Inflows")).toBeInTheDocument();
    expect(screen.getByText("Net Cash Flow")).toBeInTheDocument();
    expect(screen.getByText("Daily Average")).toBeInTheDocument();
    expect(screen.getByText("Peak Spending Day")).toBeInTheDocument();
    expect(screen.getByText("Total Transactions")).toBeInTheDocument();

    // Check transaction count
    expect(screen.getByText("28")).toBeInTheDocument();
  });
});
