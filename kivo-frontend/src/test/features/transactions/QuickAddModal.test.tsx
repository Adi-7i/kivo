import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuickAddModal } from "@/features/transactions/components/QuickAddModal";
import { renderWithProviders } from "@/test/utils/render";
import { client, mockLists, accountId, categoryId } from "../finance/fixtures";
describe("Quick Add (mocked HTTP, not Django integration)", () => {
  function setup() {
    mockLists();
    const close = vi.fn();
    renderWithProviders(<QuickAddModal open onOpenChange={close} />, { queryClient: client() });
    return close;
  }
  it("renders the established transaction tabs", () => {
    setup();
    expect(screen.getByText("Quick Add Transaction")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Expense/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Received/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Transfer/i })).toBeInTheDocument();
  });
  it("switches contextual fields and preserves the transfer invariant", async () => {
    setup();
    const actor = userEvent.setup();
    await waitFor(() => expect(screen.getByRole("tab", { name: /Received/i })).toBeEnabled());
    await actor.click(screen.getByRole("tab", { name: /Received/i }));
    expect(screen.getByLabelText(/External Funding Source/i)).toBeInTheDocument();
    await actor.click(screen.getByRole("tab", { name: /Transfer/i }));
    expect(screen.getByText(/Movement ≠ Expense/i)).toBeInTheDocument();
  });
  it("posts the verified DTO with exact strings and closes only on confirmation", async () => {
    const close = setup();
    const actor = userEvent.setup();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Record Expense" })).toBeEnabled()
    );
    await actor.type(screen.getByLabelText(/Amount/i), "0.29");
    await actor.type(screen.getByLabelText(/Description \/ Title/i), "Mock lunch");
    await actor.selectOptions(screen.getByLabelText(/Payment Account/), accountId);
    await actor.selectOptions(screen.getByLabelText(/^Category/), categoryId);
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({ id: "00000000-0000-4000-8000-000000000003" }, { status: 201 })
    );
    await actor.click(screen.getByRole("button", { name: "Record Expense" }));
    await waitFor(() => expect(close).toHaveBeenCalledWith(false));
    const post = vi.mocked(fetch).mock.calls.find(([, options]) => options?.method === "POST");
    expect(post).toBeDefined();
    expect(JSON.parse(String(post![1]!.body))).toMatchObject({
      amount: "0.29",
      account: accountId,
      category: categoryId,
      kind: "expense",
      title: "Mock lunch",
    });
    expect((post![1]!.headers as Headers).get("Idempotency-Key")).toBeTruthy();
    expect(sessionStorage.getItem("kivo:financial-write:501:quick-add")).toBeNull();
  });
});
