import { it, expect, vi } from "vitest";
import { screen, waitFor, act } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { renderWithProviders } from "@/test/utils/render";
import { useAccounts } from "@/features/finance/queries";
import { SESSION_KEY } from "@/features/auth/session";

const profile = {
  id: 1,
  name: "Owner",
  email: "owner@example.test",
  date_joined: "2026-10-26T00:00:00Z",
};
const account = {
  id: "account-a",
  name: "Owner A cash",
  kind: "cash",
  balance: "1.00",
  opening_balance: "1.00",
  opened_on: "2026-10-26",
  archived: false,
  created_at: "2026-10-26T00:00:00Z",
};
const page = { count: 1, next: null, previous: null, results: [account] };
function Harness() {
  const query = useAccounts();
  return <p>{query.data?.map((item) => item.name).join(", ") ?? "Loading accounts"}</p>;
}
function client() {
  const value = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  value.setQueryData(SESSION_KEY, profile);
  return value;
}
it("reuses the verified owned setup page without an identical account GET", async () => {
  const qc = client();
  qc.setQueryData(["accounts", 1], page);
  renderWithProviders(<Harness />, { queryClient: qc });
  expect(await screen.findByText("Owner A cash")).toBeVisible();
  expect(fetch).not.toHaveBeenCalled();
});
it("deduplicates concurrent account observers and continues actual pagination", async () => {
  const qc = client();
  vi.mocked(fetch).mockImplementation(async (url) =>
    String(url).includes("page=2")
      ? Response.json({ ...page, results: [{ ...account, id: "account-b", name: "Second cash" }] })
      : Response.json({ ...page, count: 2, next: "https://untrusted.example/page=2" })
  );
  renderWithProviders(
    <>
      <Harness />
      <Harness />
    </>,
    { queryClient: qc }
  );
  await waitFor(() => expect(screen.getAllByText("Owner A cash, Second cash")).toHaveLength(2));
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(String(vi.mocked(fetch).mock.calls[1][0])).toContain("/api/v1/accounts/?page=2");
});
it("does not reuse the previous user's verified first page after an identity change", async () => {
  const qc = client();
  qc.setQueryData(["accounts", 1], page);
  renderWithProviders(<Harness />, { queryClient: qc });
  await screen.findByText("Owner A cash");
  vi.mocked(fetch).mockResolvedValue(
    Response.json({ ...page, results: [{ ...account, name: "Owner B cash" }] })
  );
  act(() => {
    qc.setQueryData(SESSION_KEY, { ...profile, id: 2 });
  });
  await screen.findByText("Owner B cash");
  expect(screen.queryByText("Owner A cash")).not.toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(1);
});
