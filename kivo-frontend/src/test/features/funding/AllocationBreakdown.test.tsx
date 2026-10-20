import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AllocationBreakdown } from "@/features/funding/components/AllocationBreakdown";
import type { FundAllocationBreakdown } from "@/features/funding/types";

const mockBreakdown: FundAllocationBreakdown = {
  originalAmountPaise: 5000000,
  spentPaise: 2980000,
  spentPercentage: 59.6,
  lentPaise: 500000,
  lentPercentage: 10.0,
  remainingPaise: 1520000,
  remainingPercentage: 30.4,
  categories: [],
};

describe("AllocationBreakdown", () => {
  it("renders allocation composition with percentages and amounts", () => {
    render(<AllocationBreakdown breakdown={mockBreakdown} />);

    expect(screen.getByText("Allocation Composition")).toBeInTheDocument();
    expect(screen.getByText("59.6%")).toBeInTheDocument();
    expect(screen.getByText("10%")).toBeInTheDocument();
    expect(screen.getByText("30.4%")).toBeInTheDocument();
    expect(screen.getByText("Personal Spent")).toBeInTheDocument();
    expect(screen.getByText("Lent Asset")).toBeInTheDocument();
    expect(screen.getByText("Remaining")).toBeInTheDocument();
  });
});
