import { it, expect, vi, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { usePathname } from "next/navigation";
import { renderWithProviders } from "@/test/utils/render";
import { SessionBoundary, SessionMenu, SESSION_KEY } from "@/features/auth/session";
import * as navigation from "@/features/auth/navigation";
import { QueryClient } from "@tanstack/react-query";

const profile = {
  id: 10,
  name: "Session Test",
  email: "session@example.test",
  date_joined: "2026-10-22T00:00:00Z",
};
afterEach(() => vi.restoreAllMocks());

it("hides protected content during session loading and redirects a confirmed anonymous session", async () => {
  vi.mocked(usePathname).mockReturnValue("/dashboard");
  const navigate = vi.spyOn(navigation, "navigate").mockImplementation(() => {});
  renderWithProviders(
    <SessionBoundary>
      <p>Private content</p>
    </SessionBoundary>
  );
  expect(screen.queryByText("Private content")).not.toBeInTheDocument();
  await waitFor(() => expect(navigate).toHaveBeenCalledWith("/login?next=%2Fdashboard"));
});

it("hides private content during an outage without treating it as invalid credentials", async () => {
  vi.mocked(usePathname).mockReturnValue("/dashboard");
  const navigate = vi.spyOn(navigation, "navigate").mockImplementation(() => {});
  vi.mocked(fetch).mockResolvedValue(
    Response.json({ error: { status_code: 503 } }, { status: 503 })
  );
  renderWithProviders(
    <SessionBoundary>
      <p>Private content</p>
    </SessionBoundary>
  );
  expect(await screen.findByText(/cannot verify your session/i)).toBeInTheDocument();
  expect(screen.queryByText("Private content")).not.toBeInTheDocument();
  expect(navigate).not.toHaveBeenCalled();
});

it("removes old private queries when Django reports a different user", async () => {
  vi.mocked(usePathname).mockReturnValue("/settings/profile");
  vi.mocked(fetch).mockResolvedValue(Response.json(profile));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(SESSION_KEY, { ...profile, id: 99 }, { updatedAt: 0 });
  client.setQueryData(["accounts", 99], { old: "private" });
  renderWithProviders(
    <SessionBoundary>
      <p>Private content</p>
    </SessionBoundary>,
    { queryClient: client }
  );
  await waitFor(() => expect(client.getQueryData(SESSION_KEY)).toEqual(profile));
  expect(client.getQueryData(["accounts", 99])).toBeUndefined();
});

it("clears caches and tab-local recovery data only after confirmed logout", async () => {
  const navigate = vi.spyOn(navigation, "navigate").mockImplementation(() => {});
  vi.mocked(fetch).mockImplementation(async (_url, init) =>
    init?.method === "POST" ? new Response(null, { status: 204 }) : Response.json(profile)
  );
  const { queryClient } = renderWithProviders(<SessionMenu />);
  const button = await screen.findByRole("button", { name: "Sign out" });
  queryClient.setQueryData(["private", 10], "private");
  sessionStorage.setItem("kivo:onboarding:10", "recovery-data");
  await userEvent.click(button);
  await waitFor(() => expect(navigate).toHaveBeenCalledWith("/login"));
  expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  expect(sessionStorage.getItem("kivo:onboarding:10")).toBeNull();
});

it("reports an ambiguous logout failure honestly and retains the session state", async () => {
  const navigate = vi.spyOn(navigation, "navigate").mockImplementation(() => {});
  vi.mocked(fetch).mockImplementation(async (_url, init) =>
    init?.method === "POST" ? Response.json({}, { status: 503 }) : Response.json(profile)
  );
  const { queryClient } = renderWithProviders(<SessionMenu />);
  await userEvent.click(await screen.findByRole("button", { name: "Sign out" }));
  expect(await screen.findByText(/Logout was not confirmed/i)).toBeInTheDocument();
  expect(queryClient.getQueryData(SESSION_KEY)).toEqual(profile);
  expect(navigate).not.toHaveBeenCalled();
});
