import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useFinancialWrite, FinancialWriteStatus } from "@/features/finance/useFinancialWrite";
import { renderWithProviders } from "@/test/utils/render";
import { client, accountId } from "./fixtures";
function Harness({ endpoint = "/api/v1/transactions/" }: { endpoint?: string }) {
  const write = useFinancialWrite("test");
  return (
    <>
      <button
        disabled={write.busy || write.pending}
        onClick={() => void write.run(endpoint, { amount: "0.29", account: accountId })}
      >
        Post
      </button>
      <FinancialWriteStatus write={write} />
    </>
  );
}
describe("financial mutation recovery (mocked HTTP only)", () => {
  it.each([
    "transactions",
    "contacts",
    "loans",
    "settlements",
    "shared-bills",
    "budgets",
    "rent/plans",
    "rent/reserves",
  ])(
    "preserves %s original key/body through remount, GET reconciliation and deliberate retry",
    async (domain) => {
      vi.mocked(fetch).mockRejectedValueOnce(new TypeError("network lost"));
      const actor = userEvent.setup();
      const queryClient = client();
      const endpoint = `/api/v1/${domain}/`;
      const view = renderWithProviders(<Harness endpoint={endpoint} />, { queryClient });
      await actor.dblClick(screen.getByText("Post"));
      await screen.findByText(/network/i);
      expect(fetch).toHaveBeenCalledTimes(1);
      const original = vi.mocked(fetch).mock.calls[0][1]!;
      expect(screen.getByText("Post")).toBeDisabled();
      view.unmount();
      renderWithProviders(<Harness endpoint={endpoint} />, { queryClient });
      expect(screen.queryByText("Retry original request")).not.toBeInTheDocument();
      vi.mocked(fetch).mockResolvedValueOnce(
        Response.json({ count: 0, next: null, previous: null, results: [] })
      );
      await actor.click(screen.getByText("Check server status"));
      await screen.findByText("Retry original request");
      expect(vi.mocked(fetch).mock.calls[1][1]?.method).toBe("GET");
      expect(vi.mocked(fetch).mock.calls[1][0]).toBe(endpoint);
      vi.mocked(fetch).mockResolvedValueOnce(
        Response.json({ id: "00000000-0000-4000-8000-000000000003" })
      );
      await actor.click(screen.getByText("Retry original request"));
      await waitFor(() =>
        expect(sessionStorage.getItem("kivo:financial-write:501:test")).toBeNull()
      );
      const retry = vi.mocked(fetch).mock.calls[2][1]!;
      expect(retry.body).toBe(original.body);
      expect((retry.headers as Headers).get("Idempotency-Key")).toBe(
        (original.headers as Headers).get("Idempotency-Key")
      );
    }
  );
  it.each([
    ["plans", "generate"],
    ["obligations", "payments"],
    ["obligations", "change-status"],
    ["payments", "correct"],
    ["payments", "reverse"],
    ["reserves", "adjust"],
  ])(
    "reconciles a rent %s/%s against the actual owned resource before replay",
    async (domain, action) => {
      const resource = `/api/v1/rent/${domain}/${accountId}/`;
      const endpoint = resource + action + "/";
      const actor = userEvent.setup();
      vi.mocked(fetch).mockRejectedValueOnce(new TypeError("network lost"));
      const queryClient = client();
      const view = renderWithProviders(<Harness endpoint={endpoint} />, { queryClient });
      await actor.click(screen.getByText("Post"));
      await screen.findByText(/network/i);
      const original = vi.mocked(fetch).mock.calls[0][1]!;
      view.unmount();
      renderWithProviders(<Harness endpoint={endpoint} />, { queryClient });
      vi.mocked(fetch).mockResolvedValueOnce(Response.json({ id: accountId }));
      await actor.click(screen.getByText("Check server status"));
      await screen.findByText("Retry original request");
      expect(vi.mocked(fetch).mock.calls[1][0]).toBe(resource);
      vi.mocked(fetch).mockResolvedValueOnce(Response.json({ id: accountId }));
      await actor.click(screen.getByText("Retry original request"));
      await waitFor(() =>
        expect(sessionStorage.getItem("kivo:financial-write:501:test")).toBeNull()
      );
      expect(vi.mocked(fetch).mock.calls[2][0]).toBe(endpoint);
      const replay = vi.mocked(fetch).mock.calls[2][1]!;
      expect(replay.body).toBe(original.body);
      expect((replay.headers as Headers).get("Idempotency-Key")).toBe(
        (original.headers as Headers).get("Idempotency-Key")
      );
    }
  );
  it("shows backend validation and releases a definitively rejected intent", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json(
        { error: { status_code: 400, details: { amount: ["Use exact INR."] } } },
        { status: 400 }
      )
    );
    renderWithProviders(<Harness />, { queryClient: client() });
    await userEvent.click(screen.getByText("Post"));
    expect(await screen.findByRole("alert")).toHaveTextContent("amount: Use exact INR.");
    expect(sessionStorage.getItem("kivo:financial-write:501:test")).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each([403, 409, 429])(
    "releases a confirmed rejection (%s) without automatic retry",
    async (status) => {
      vi.mocked(fetch).mockResolvedValueOnce(
        Response.json(
          { error: { status_code: status, details: { detail: "This operation was rejected." } } },
          { status }
        )
      );
      renderWithProviders(<Harness />, { queryClient: client() });
      await userEvent.click(screen.getByText("Post"));
      expect(await screen.findByRole("alert")).toHaveTextContent("This operation was rejected.");
      expect(sessionStorage.getItem("kivo:financial-write:501:test")).toBeNull();
      expect(fetch).toHaveBeenCalledTimes(1);
    }
  );
  it("keeps conflicting idempotency identity locked rather than substituting a new key", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json(
        {
          error: {
            status_code: 409,
            details: { detail: "Idempotency key was reused with different data." },
          },
        },
        { status: 409 }
      )
    );
    renderWithProviders(<Harness />, { queryClient: client() });
    await userEvent.click(screen.getByText("Post"));
    expect(await screen.findByText("Check server status")).toBeInTheDocument();
    expect(screen.getByText("Post")).toBeDisabled();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("does not declare financial success for a malformed 200 confirmation", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ id: 501 }));
    renderWithProviders(<Harness />, { queryClient: client() });
    await userEvent.click(screen.getByText("Post"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "valid financial resource identifier"
    );
    expect(screen.getByText("Post")).toBeDisabled();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("does not send a write when recovery storage is unavailable", async () => {
    renderWithProviders(<Harness />, { queryClient: client() });
    const storage = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    await userEvent.click(screen.getByText("Post"));
    expect(await screen.findByRole("alert")).toHaveTextContent("No request was sent");
    expect(fetch).not.toHaveBeenCalled();
    storage.mockRestore();
  });
});
