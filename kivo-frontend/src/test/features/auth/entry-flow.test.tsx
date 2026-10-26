import { afterEach, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { usePathname } from "next/navigation";
import { renderWithProviders } from "@/test/utils/render";
import { SessionBoundary } from "@/features/auth/session";
import * as navigation from "@/features/auth/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { NavigationProvider } from "@/components/layout/NavigationContext";
import { AppNav } from "@/components/layout/AppNav";

const profile = {
  id: 71,
  name: "Entry Test",
  email: "entry@example.test",
  date_joined: "2026-10-26T00:00:00Z",
};
function setup(path: string, count: number) {
  vi.mocked(usePathname).mockReturnValue(path);
  const navigate = vi.spyOn(navigation, "navigate").mockImplementation(() => {});
  vi.mocked(fetch).mockImplementation(async (url) =>
    String(url).includes("/auth/me/")
      ? Response.json(profile)
      : Response.json({ count, next: null, previous: null, results: [] })
  );
  const rendered = renderWithProviders(
    <SessionBoundary>
      <p>Route content</p>
    </SessionBoundary>
  );
  return { navigate, ...rendered };
}
afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState({}, "", "/");
});

it.each(["/", "/login", "/register"])(
  "routes authenticated %s to onboarding when Django reports no accounts",
  async (path) => {
    const { navigate } = setup(path, 0);
    expect(screen.queryByText("Route content")).not.toBeInTheDocument();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/onboarding"));
    expect(screen.queryByText("Route content")).not.toBeInTheDocument();
  }
);

it.each(["/", "/login", "/register"])(
  "routes authenticated %s to dashboard when Django reports an account",
  async (path) => {
    const { navigate } = setup(path, 1);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/dashboard"));
    expect(screen.queryByText("Route content")).not.toBeInTheDocument();
  }
);

it("honors a safe private return destination without allowing an onboarding loop", async () => {
  window.history.replaceState({}, "", "/login?next=/onboarding?next=/dashboard");
  const { navigate } = setup("/login", 1);
  await waitFor(() => expect(navigate).toHaveBeenCalledWith("/dashboard"));
});

it("preserves a supported private return destination", async () => {
  window.history.replaceState({}, "", "/login?next=/settings/profile");
  const { navigate } = setup("/login", 1);
  await waitFor(() => expect(navigate).toHaveBeenCalledWith("/settings/profile"));
});

it("gates direct protected navigation on setup without flashing private content", async () => {
  const { navigate } = setup("/reports", 0);
  await waitFor(() => expect(navigate).toHaveBeenCalledWith("/onboarding?next=%2Freports"));
  expect(screen.queryByText("Route content")).not.toBeInTheDocument();
});

it("renders completed protected content only after session and account verification", async () => {
  const { navigate } = setup("/dashboard", 1);
  expect(screen.queryByText("Route content")).not.toBeInTheDocument();
  expect(await screen.findByText("Route content")).toBeInTheDocument();
  expect(navigate).not.toHaveBeenCalled();
});

it("leaves the authenticated onboarding account check to the existing wizard", async () => {
  const { navigate } = setup("/onboarding", 0);
  expect(await screen.findByText("Route content")).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(navigate).not.toHaveBeenCalled();
});

it.each(["/login", "/register"])(
  "keeps anonymous %s accessible after a confirmed 401",
  async (path) => {
    vi.mocked(usePathname).mockReturnValue(path);
    const navigate = vi.spyOn(navigation, "navigate").mockImplementation(() => {});
    renderWithProviders(
      <SessionBoundary>
        <p>Public form</p>
      </SessionBoundary>
    );
    expect(await screen.findByText("Public form")).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  }
);

it("retains identity and blocks navigation on an account outage, then recovers through a read-only retry", async () => {
  vi.mocked(usePathname).mockReturnValue("/");
  const navigate = vi.spyOn(navigation, "navigate").mockImplementation(() => {});
  let unavailable = true;
  vi.mocked(fetch).mockImplementation(async (url) => {
    if (String(url).includes("/auth/me/")) return Response.json(profile);
    return unavailable
      ? Response.json({}, { status: 503 })
      : Response.json({ count: 1, next: null, previous: null, results: [] });
  });
  const { queryClient } = renderWithProviders(
    <SessionBoundary>
      <p>Private content</p>
    </SessionBoundary>
  );
  expect(await screen.findByText(/session has not been signed out/i)).toBeInTheDocument();
  expect(queryClient.getQueryData(["session"])).toEqual(profile);
  expect(navigate).not.toHaveBeenCalled();
  unavailable = false;
  await userEvent.click(screen.getByRole("button", { name: "Retry account check" }));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith("/dashboard"));
  expect(vi.mocked(fetch).mock.calls.every(([, init]) => init?.method === "GET")).toBe(true);
});

it.each(["/", "/login", "/register"])(
  "shows a recoverable session outage on %s without assuming logout",
  async (path) => {
    vi.mocked(usePathname).mockReturnValue(path);
    const navigate = vi.spyOn(navigation, "navigate").mockImplementation(() => {});
    vi.mocked(fetch).mockResolvedValue(Response.json({}, { status: 503 }));
    renderWithProviders(
      <SessionBoundary>
        <p>Public form</p>
      </SessionBoundary>
    );
    expect(await screen.findByRole("button", { name: "Retry session check" })).toBeInTheDocument();
    expect(screen.queryByText("Public form")).not.toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  }
);

it("keeps actual module navigation while removing showcase and development badges", async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json(profile));
  renderWithProviders(
    <NavigationProvider>
      <AppHeader />
      <AppNav />
    </NavigationProvider>
  );
  expect(await screen.findByRole("button", { name: "Sign out" })).toBeInTheDocument();
  for (const label of [
    "Dashboard",
    "Money Accounts",
    "Transactions",
    "Funds & Attribution",
    "People & Friends",
    "Shared Expenses",
    "Rent & Reserves",
    "Budgets",
    "Reports & Analytics",
    "Categories",
    "Profile",
  ])
    expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
  expect(
    screen.queryByText(/Phase [1-7]|Design System|API Transport Ready/)
  ).not.toBeInTheDocument();
});
