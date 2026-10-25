import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { forwardDjango } from "@/lib/server/api-bridge";
import { invalidateFinance } from "@/features/finance/queries";
import { loanSchema } from "@/features/lending/schemas/loan.schema";
import { sharedBillSchema } from "@/features/shared-expenses/schemas/shared-bill.schema";
import { LendBorrowModal } from "@/features/lending/components/LendBorrowModal";
import { CreateSharedBillModal } from "@/features/shared-expenses/components/CreateSharedBillModal";
import type { EventDTO } from "@/features/finance/api";
import type { BillDTO } from "@/features/relationships/api";
import { renderWithProviders } from "@/test/utils/render";
import { client, account, accountId, categoryId, user } from "./fixtures";
const contactId = "00000000-0000-4000-8000-000000000009";
const createdId = "00000000-0000-4000-8000-000000000008";
const billId = "00000000-0000-4000-8000-000000000007";
const billEvent: EventDTO = {
  id: createdId,
  kind: "shared_due",
  amount: "0.30",
  effective_date: "2026-10-24",
  created_at: "2026-10-24T00:00:00Z",
  account: null,
  destination: null,
  category: categoryId,
  title: "Mock shared bill",
  merchant: "",
  notes: "",
  payment_method: "",
  funding_source: "",
  contact: contactId,
  classification: "",
  original_expense: null,
  reverses: null,
  supersedes: null,
  reversed_by: null,
  reason: "",
  status: "posted",
  financial_effects: [],
  claims: [],
};
const billResponse: BillDTO = {
  id: billId,
  event: billEvent,
  payer: contactId,
  split_method: "custom",
  shares: [
    { contact: null, amount: "0.29", claim: null },
    { contact: contactId, amount: "0.01", claim: null },
  ],
  created_at: billEvent.created_at,
};
function mockBillChoices() {
  vi.mocked(fetch).mockImplementation(async (input, init) => {
    if (init?.method === "POST") return Response.json(billResponse, { status: 201 });
    const path = String(input),
      paged = (results: unknown[]) =>
        Response.json({ count: results.length, next: null, previous: null, results });
    if (path.includes("/contacts/"))
      return paged([{ id: contactId, display_name: "Mock friend", archived: false }]);
    if (path.includes("/accounts/")) return paged([account]);
    if (path.includes("/categories/"))
      return paged([{ id: categoryId, name: "Mock category", archived: false, parent: null }]);
    return Response.json(user);
  });
}
const validBill = {
  title: "Mock bill",
  amount: "0.30",
  category: categoryId,
  effectiveDate: "2026-10-24",
  payerType: "user" as const,
  accountId,
  splitMethod: "custom" as const,
  selectedParticipants: [contactId],
  customShares: { user: "0.29", [contactId]: "0.01" },
};
describe("Part 4 actual contract boundaries (mocked HTTP only)", () => {
  it("validates custom split input exactly, including zero shares and mismatches", () => {
    expect(sharedBillSchema.safeParse(validBill).success).toBe(true);
    expect(
      sharedBillSchema.safeParse({ ...validBill, customShares: { user: "0.30", [contactId]: "0" } })
        .success
    ).toBe(true);
    expect(
      sharedBillSchema.safeParse({
        ...validBill,
        customShares: { user: "0.29", [contactId]: "0.02" },
      }).success
    ).toBe(false);
    expect(
      sharedBillSchema.safeParse({
        ...validBill,
        customShares: { user: "0.29", [contactId]: "0.001" },
      }).success
    ).toBe(false);
  });
  it("requires payer participation, unique owned UUID inputs and real dates", () => {
    expect(
      sharedBillSchema.safeParse({ ...validBill, payerType: "friend", payerContactId: createdId })
        .success
    ).toBe(false);
    expect(
      sharedBillSchema.safeParse({ ...validBill, selectedParticipants: [contactId, contactId] })
        .success
    ).toBe(false);
    expect(
      loanSchema.safeParse({
        kind: "lend",
        contactId: "preview-contact",
        accountId,
        amount: "0.29",
        effectiveDate: "2026-02-30",
        title: "Bad input",
      }).success
    ).toBe(false);
  });
  it.each(["contacts", "claims", "loans", "settlements", "shared-bills"])(
    "keeps %s reads scoped and rejects invented query filters",
    async (domain) => {
      vi.mocked(fetch).mockResolvedValueOnce(Response.json({}));
      expect(
        (await forwardDjango(new Request(`http://localhost:3000/api/v1/${domain}/?page=1`))).status
      ).toBe(200);
      expect(
        (await forwardDjango(new Request(`http://localhost:3000/api/v1/${domain}/?other_user=502`)))
          .status
      ).toBe(400);
      expect(
        (
          await forwardDjango(
            new Request(`http://localhost:3000/api/v1/${domain}/${contactId}/`, {
              method: "DELETE",
            })
          )
        ).status
      ).toBe(405);
    }
  );
  it("does not expose unsupported or claim mutation workflows", async () => {
    expect(
      (
        await forwardDjango(
          new Request("http://localhost:3000/api/v1/not-integrated/", { method: "POST" })
        )
      ).status
    ).toBe(404);
    expect(
      (await forwardDjango(new Request("http://localhost:3000/api/v1/claims/", { method: "POST" })))
        .status
    ).toBe(405);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("invalidates every relationship consumer with accounts, sources and dashboard", async () => {
    const qc = client(),
      spy = vi.spyOn(qc, "invalidateQueries");
    await invalidateFinance(qc);
    for (const root of [
      "contacts",
      "claims",
      "loans",
      "settlements",
      "shared-bills",
      "accounts",
      "transactions",
      "dashboard",
      "funds",
      "reports",
    ])
      expect(spy).toHaveBeenCalledWith({ queryKey: [root] });
  });
  it("submits a real-contract loan only once with exact strings and a durable key", async () => {
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      const path = String(input),
        paged = (rows: unknown[]) =>
          Response.json({ count: rows.length, next: null, previous: null, results: rows });
      if (init?.method === "POST") return Response.json({ id: createdId }, { status: 201 });
      if (path.includes("/contacts/"))
        return paged([
          {
            id: contactId,
            display_name: "Mock owned friend",
            notes: "",
            is_roommate: false,
            archived: false,
            created_at: "2026-10-24T00:00:00Z",
            receivable: "0.00",
            payable: "0.00",
          },
        ]);
      if (path.includes("/accounts/")) return paged([account]);
      return Response.json(user);
    });
    const close = vi.fn(),
      actor = userEvent.setup();
    renderWithProviders(<LendBorrowModal open onOpenChange={close} />, { queryClient: client() });
    await screen.findByRole("option", { name: "Mock owned friend" });
    await actor.selectOptions(screen.getByLabelText(/Select Friend/), contactId);
    await actor.type(screen.getByLabelText(/Amount/), "0.29");
    await actor.type(screen.getByLabelText(/Title|Description/), "Mock controlled loan");
    await actor.dblClick(screen.getByRole("button", { name: "Record Lent Money" }));
    await waitFor(() => expect(close).toHaveBeenCalledWith(false));
    const posts = vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === "POST");
    expect(posts).toHaveLength(1);
    expect(JSON.parse(String(posts[0][1]?.body))).toMatchObject({
      kind: "lend",
      amount: "0.29",
      contact: contactId,
      account: accountId,
    });
    expect((posts[0][1]?.headers as Headers).get("Idempotency-Key")).toBeTruthy();
  });
  it("submits an equal split with one contact and leaves share amounts to Django", async () => {
    mockBillChoices();
    const close = vi.fn(),
      actor = userEvent.setup();
    renderWithProviders(<CreateSharedBillModal open onOpenChange={close} />, {
      queryClient: client(),
    });
    await screen.findByRole("option", { name: "Mock category" });
    await actor.type(screen.getByLabelText("Bill Title"), "Mock equal bill");
    await actor.type(screen.getByLabelText("Total Bill Amount (₹)"), "0.29");
    await actor.selectOptions(screen.getByLabelText("Category"), categoryId);
    await actor.selectOptions(screen.getByLabelText("Payment Account"), accountId);
    await actor.click(screen.getByLabelText("Mock friend", { exact: true }));
    await actor.click(screen.getByRole("button", { name: "Create Shared Bill" }));
    await waitFor(() => expect(close).toHaveBeenCalledWith(false));
    const post = vi.mocked(fetch).mock.calls.find(([, init]) => init?.method === "POST")!;
    expect(JSON.parse(String(post[1]?.body))).toMatchObject({
      payer: null,
      account: accountId,
      amount: "0.29",
      split_method: "equal",
      participants: [{ contact: null }, { contact: contactId }],
    });
  });
  it("preserves the disabled original payer and exact custom fields in a bill-UUID correction", async () => {
    mockBillChoices();
    const close = vi.fn(),
      actor = userEvent.setup();
    renderWithProviders(
      <CreateSharedBillModal open onOpenChange={close} initialBill={billResponse} />,
      { queryClient: client() }
    );
    await screen.findByLabelText("Custom share for Mock friend (₹)");
    await actor.type(screen.getByLabelText("Audit Reason"), "Mock audited correction");
    await actor.clear(screen.getByLabelText("Total Bill Amount (₹)"));
    await actor.type(screen.getByLabelText("Total Bill Amount (₹)"), "0.31");
    await actor.clear(screen.getByLabelText("Your Custom Share (₹)"));
    await actor.type(screen.getByLabelText("Your Custom Share (₹)"), "0.30");
    await actor.click(screen.getByRole("button", { name: "Save Bill Correction" }));
    await waitFor(() => expect(close).toHaveBeenCalledWith(false));
    const post = vi.mocked(fetch).mock.calls.find(([, init]) => init?.method === "POST")!;
    expect(post[0]).toBe(`/api/v1/shared-bills/${billId}/correct/`);
    expect(JSON.parse(String(post[1]?.body))).toMatchObject({
      payer: contactId,
      account: null,
      amount: "0.31",
      split_method: "custom",
      participants: [
        { contact: null, amount: "0.30" },
        { contact: contactId, amount: "0.01" },
      ],
      reason: "Mock audited correction",
    });
  });
});
