import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ClaimCard } from "@/features/lending/components/ClaimCard";
import type { ClaimEntity } from "@/features/lending/types";

describe("ClaimCard", () => {
  const receivableClaim: ClaimEntity = {
    id: "claim-rec-1",
    contactId: "c-rohan-1",
    contactName: "Rohan Sharma",
    direction: "receivable",
    title: "Weekend Trip Cab Fare",
    principalPaise: 150000, // ₹1,500.00
    outstandingPaise: 50000, // ₹500.00 outstanding (₹1,000.00 recovered)
    status: "partial",
    createdAt: "2026-10-10T12:00:00Z",
    effectiveDate: "2026-10-10",
    notes: "Split Uber ride to airport",
  };

  const payableClaim: ClaimEntity = {
    id: "claim-pay-1",
    contactId: "c-priya-2",
    contactName: "Priya Patel",
    direction: "payable",
    title: "Concert Ticket Advance",
    principalPaise: 250000, // ₹2,500.00
    outstandingPaise: 250000,
    status: "open",
    createdAt: "2026-10-12T14:00:00Z",
    effectiveDate: "2026-10-12",
  };

  const settledClaim: ClaimEntity = {
    ...receivableClaim,
    id: "claim-settled-1",
    outstandingPaise: 0,
    status: "settled",
  };

  it("renders receivable claim with contact, status badge and recovery amounts", () => {
    render(<ClaimCard claim={receivableClaim} />);

    expect(screen.getByText("Weekend Trip Cab Fare")).toBeInTheDocument();
    expect(screen.getByText(/Receivable from Rohan Sharma/i)).toBeInTheDocument();
    expect(screen.getByText("Partially Paid")).toBeInTheDocument();
    expect(screen.getByText(/Principal:/i)).toBeInTheDocument();
    expect(screen.queryByText("₹1,000.00")).not.toBeInTheDocument();
    expect(screen.getByText("₹1,500.00")).toBeInTheDocument();
    expect(screen.getByText("₹500.00")).toBeInTheDocument();
    expect(screen.getByText("Split Uber ride to airport")).toBeInTheDocument();
  });

  it("renders payable claim with direction and repayment details", () => {
    render(<ClaimCard claim={payableClaim} />);

    expect(screen.getByText("Concert Ticket Advance")).toBeInTheDocument();
    expect(screen.getByText(/Payable to Priya Patel/i)).toBeInTheDocument();
    expect(screen.getByText("Active Claim")).toBeInTheDocument();
    expect(screen.getByText(/Outstanding:/i)).toBeInTheDocument();
  });

  it("does not fabricate a recovered amount or a financial progress percentage", () => {
    render(<ClaimCard claim={receivableClaim} />);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByText(/Recovered:/i)).not.toBeInTheDocument();
    expect(screen.getByText("₹500.00")).toBeInTheDocument();
  });

  it("calls onSettle with claim entity when settle button is clicked", () => {
    const handleSettle = vi.fn();
    render(<ClaimCard claim={receivableClaim} onSettle={handleSettle} />);

    const settleBtn = screen.getByRole("button", { name: "Record Repayment" });
    fireEvent.click(settleBtn);

    expect(handleSettle).toHaveBeenCalledTimes(1);
    expect(handleSettle).toHaveBeenCalledWith(receivableClaim);
  });

  it("renders 'Pay Back' button for payable claims with outstanding balance", () => {
    const handleSettle = vi.fn();
    render(<ClaimCard claim={payableClaim} onSettle={handleSettle} />);

    const payBackBtn = screen.getByRole("button", { name: "Pay Back" });
    fireEvent.click(payBackBtn);

    expect(handleSettle).toHaveBeenCalledWith(payableClaim);
  });

  it("does not render settle button if outstanding amount is zero", () => {
    const handleSettle = vi.fn();
    render(<ClaimCard claim={settledClaim} onSettle={handleSettle} />);

    expect(
      screen.queryByRole("button", { name: /Record Repayment|Pay Back/i })
    ).not.toBeInTheDocument();
  });
});
