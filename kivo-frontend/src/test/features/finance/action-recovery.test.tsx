import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransactionDetailCard } from "@/features/transactions/components/TransactionDetailCard";
import { transactionEntity, type EventDTO } from "@/features/finance/api";
import { renderWithProviders } from "@/test/utils/render";
import { accountId, client } from "./fixtures";

const event: EventDTO = {
  id: "00000000-0000-4000-8000-000000000003",
  kind: "expense",
  amount: "0.29",
  effective_date: "2026-10-22",
  created_at: "2026-10-22T00:00:00Z",
  account: accountId,
  destination: null,
  category: null,
  title: "Mock original expense",
  merchant: "",
  notes: "",
  payment_method: "",
  funding_source: "",
  contact: null,
  classification: "",
  original_expense: null,
  reverses: null,
  supersedes: null,
  reversed_by: "00000000-0000-4000-8000-000000000004",
  reason: "",
  status: "reversed",
  financial_effects: [],
  claims: [],
};

describe("immutable action recovery (mocked HTTP only)", () => {
  it.each(["reversed", "voided"] as const)(
    "can reopen a pending intent after refresh shows %s",
    async (status) => {
      sessionStorage.setItem(
        `kivo:financial-write:501:transaction:${event.id}:action`,
        JSON.stringify({
          endpoint: `/api/v1/transactions/${event.id}/correct/`,
          method: "POST",
          key: "original-key",
          body: { amount: "0.19", reason: "Mock correction reason" },
        })
      );
      renderWithProviders(
        <TransactionDetailCard transaction={transactionEntity({ ...event, status }, [], [])} />,
        { queryClient: client() }
      );
      const resolve = screen.getByRole("button", { name: "Resolve pending request" });
      expect(resolve).toBeEnabled();
      await userEvent.click(resolve);
      expect(screen.getByRole("button", { name: "Check server status" })).toBeVisible();
      expect(screen.getByRole("button", { name: "Execute Reversal" })).toBeDisabled();
      expect(fetch).not.toHaveBeenCalled();
    }
  );
  it("does not enable a new correction for a reversed original without a pending intent", () => {
    renderWithProviders(<TransactionDetailCard transaction={transactionEntity(event, [], [])} />, {
      queryClient: client(),
    });
    expect(screen.getByRole("button", { name: "Record Reversal / Correction" })).toBeDisabled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
