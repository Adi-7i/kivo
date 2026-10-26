import { describe, it, expect, vi } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { QueryState } from "@/features/finance/QueryState";
import { ServerMoney } from "@/features/funding/components/LiveFunding";
import { useOwnedQuery } from "@/features/finance/useOwnedQuery";
import { renderWithProviders } from "@/test/utils/render";
import { client, user } from "./fixtures";
describe("report state boundaries (mocked HTTP only)", () => {
  it("unknown capacity is unavailable, never a fabricated zero", () => {
    render(<ServerMoney value={null} />);
    expect(screen.getByText("Not available")).toBeVisible();
    expect(screen.queryByText("₹0.00")).not.toBeInTheDocument();
  });
  it("shows actual network loading, not a disabled dependent query", () => {
    const view = render(
      <QueryState
        query={{
          isPending: true,
          isFetching: false,
          isError: false,
          error: null,
          refetch: vi.fn(),
        }}
      />
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    view.rerender(
      <QueryState
        query={{ isPending: true, isFetching: true, isError: false, error: null, refetch: vi.fn() }}
      />
    );
    expect(screen.getByRole("status")).toHaveTextContent("Loading your information");
  });
  it("does not turn a temporary report failure into successful empty data", () => {
    render(
      <QueryState
        query={{
          isPending: false,
          isError: true,
          error: new Error("Report temporarily unavailable"),
          refetch: vi.fn(),
        }}
      />
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Report temporarily unavailable");
    expect(screen.getByRole("button", { name: "Retry loading" })).toBeEnabled();
  });
  it("does not expose previous-user report data while a new identity loads", async () => {
    function Harness() {
      const query = useOwnedQuery<{ label: string }>("dashboard", "/api/v1/dashboard/");
      return <p>{query.data?.label ?? "No private data"}</p>;
    }
    const qc = client();
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ label: "Mock owner A" }));
    renderWithProviders(<Harness />, { queryClient: qc });
    await screen.findByText("Mock owner A");
    expect(qc.getQueryCache().findAll({ queryKey: ["dashboard"] })[0]?.queryKey[1]).toBe(501);
    let complete: (value: Response) => void = () => {};
    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          complete = resolve;
        })
    );
    act(() => {
      qc.setQueryData(["session"], { ...user, id: 502 });
    });
    await screen.findByText("No private data");
    expect(screen.queryByText("Mock owner A")).not.toBeInTheDocument();
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    await act(async () => complete(Response.json({ label: "Mock owner B" })));
    await screen.findByText("Mock owner B");
    expect(
      qc
        .getQueryCache()
        .findAll({ queryKey: ["dashboard"] })
        .map((q) => q.queryKey[1])
    ).toEqual([502]); // fixture gcTime=0 removes the unobserved old identity immediately
  });
});
