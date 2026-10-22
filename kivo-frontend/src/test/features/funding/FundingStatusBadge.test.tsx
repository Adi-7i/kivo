import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FundingStatusBadge } from "@/features/funding/components/FundingStatusBadge";

describe("FundingStatusBadge", () => {
  it("renders active status badge correctly", () => {
    render(<FundingStatusBadge status="active" />);
    expect(screen.getByText("Active (Allocating)")).toBeInTheDocument();
  });

  it("renders exhausted status badge correctly", () => {
    render(<FundingStatusBadge status="exhausted" />);
    expect(screen.getByText("Exhausted")).toBeInTheDocument();
  });

  it("renders partially allocated status badge correctly", () => {
    render(<FundingStatusBadge status="partially_allocated" />);
    expect(screen.getByText("Partially Allocated")).toBeInTheDocument();
  });

  it("renders unresolved status badge correctly", () => {
    render(<FundingStatusBadge status="unresolved" />);
    expect(screen.getByText("Unresolved Allocation")).toBeInTheDocument();
  });

  it("renders corrected status badge correctly", () => {
    render(<FundingStatusBadge status="corrected" />);
    expect(screen.getByText("Corrected History")).toBeInTheDocument();
  });
});
