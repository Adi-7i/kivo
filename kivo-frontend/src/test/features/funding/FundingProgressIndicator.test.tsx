import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FundingProgressIndicator } from "@/features/funding/components/FundingProgressIndicator";

describe("FundingProgressIndicator", () => {
  it("renders progressbar with correct accessible attributes", () => {
    render(
      <FundingProgressIndicator
        originalAmountPaise={100000} // ₹1,000.00
        spentPaise={50000} // 50%
        lentPaise={20000} // 20%
        remainingPaise={30000} // 30%
        showLabels
      />
    );

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toBeInTheDocument();
    expect(progressbar).toHaveAttribute("aria-valuenow", "70"); // 50 + 20
    expect(progressbar).toHaveAttribute(
      "aria-label",
      "Fund allocation: 50% spent, 20% lent, 30% remaining"
    );

    expect(screen.getByText("Spent (50%)")).toBeInTheDocument();
    expect(screen.getByText("Lent Asset (20%)")).toBeInTheDocument();
    expect(screen.getByText("Remaining (30%)")).toBeInTheDocument();
  });

  it("handles 100% spent without overflowing", () => {
    render(
      <FundingProgressIndicator
        originalAmountPaise={100000}
        spentPaise={100000}
        lentPaise={0}
        remainingPaise={0}
        showLabels
      />
    );

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuenow", "100");
    expect(screen.getByText("Spent (100%)")).toBeInTheDocument();
    expect(screen.getByText("Remaining (0%)")).toBeInTheDocument();
  });
});
