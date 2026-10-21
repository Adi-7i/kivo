import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RentStatusBadge } from "@/features/rent/components/RentStatusBadge";

describe("RentStatusBadge", () => {
  it("renders 'Paid' badge for paid obligations", () => {
    render(<RentStatusBadge status="paid" />);
    expect(screen.getByText("Paid")).toBeInTheDocument();
  });

  it("renders 'Partially Paid' badge for partial obligations", () => {
    render(<RentStatusBadge status="partial" />);
    expect(screen.getByText("Partially Paid")).toBeInTheDocument();
  });

  it("renders 'Overdue' badge for overdue obligations", () => {
    render(<RentStatusBadge status="overdue" />);
    expect(screen.getByText("Overdue")).toBeInTheDocument();
  });

  it("renders 'Due Today' badge for due obligations", () => {
    render(<RentStatusBadge status="due" />);
    expect(screen.getByText("Due Today")).toBeInTheDocument();
  });

  it("renders 'Skipped' badge for skipped obligations", () => {
    render(<RentStatusBadge status="skipped" />);
    expect(screen.getByText("Skipped")).toBeInTheDocument();
  });

  it("renders 'Upcoming' badge for upcoming obligations", () => {
    render(<RentStatusBadge status="upcoming" />);
    expect(screen.getByText("Upcoming")).toBeInTheDocument();
  });
});
