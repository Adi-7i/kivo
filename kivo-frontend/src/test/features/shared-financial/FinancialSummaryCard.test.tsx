import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FinancialSummaryCard } from "@/features/shared-financial/FinancialSummaryCard";
import { Wallet } from "lucide-react";

describe("FinancialSummaryCard component", () => {
  it("renders metric title, formatted amount, and subtitle", () => {
    render(
      <FinancialSummaryCard
        title="Total Liquid Balance"
        amountPaise={5325000}
        subtitle="All active cash, bank & wallet balances"
        icon={<Wallet data-testid="wallet-icon" className="size-4" />}
        variant="default"
      />
    );

    expect(screen.getByText("Total Liquid Balance")).toBeInTheDocument();
    expect(screen.getByText("₹53,250.00")).toBeInTheDocument();
    expect(screen.getByText("All active cash, bank & wallet balances")).toBeInTheDocument();
    expect(screen.getByTestId("wallet-icon")).toBeInTheDocument();
  });
});
