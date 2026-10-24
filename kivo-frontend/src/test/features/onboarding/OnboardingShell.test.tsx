import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders as render } from "@/test/utils/render";
import userEvent from "@testing-library/user-event";
import { OnboardingShell } from "@/features/onboarding/components/OnboardingShell";
import * as navigation from "@/features/auth/navigation";

const account = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "HDFC Checking",
  kind: "bank",
  opened_on: "2026-10-22",
  opening_balance: "12500.00",
  balance: "12500.00",
  archived: false,
  created_at: "2026-10-22T00:00:00Z",
};

describe("OnboardingShell multi-step flow", () => {
  beforeEach(() => {
    vi.spyOn(navigation, "navigate").mockImplementation(() => {});
    vi.mocked(fetch).mockImplementation(async (url, options) => {
      if (String(url).includes("/auth/me/"))
        return Response.json({
          id: 1,
          name: "Adarsh Sharma",
          email: "adarsh@example.com",
          date_joined: "2026-10-22T00:00:00Z",
        });
      if (options?.method === "POST") return Response.json(account, { status: 201 });
      return Response.json({ count: 0, results: [], next: null, previous: null });
    });
  });
  afterEach(() => vi.restoreAllMocks());
  it("progresses smoothly through all 4 onboarding steps preserving entered state", async () => {
    const user = userEvent.setup();
    render(<OnboardingShell />);

    // STEP 1: Welcome
    expect(await screen.findByRole("heading", { name: "Welcome to Kivo" })).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();

    const beginBtn = screen.getByRole("button", { name: /Begin Setup/i });
    await user.click(beginBtn);

    // STEP 2: Personal Setup
    expect(screen.getByRole("heading", { name: "Personal Setup" })).toBeInTheDocument();
    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/Display Name/i);
    expect(nameInput).toHaveValue("Adarsh Sharma");
    expect(nameInput).toHaveAttribute("readonly");

    const continueAccountBtn = screen.getByRole("button", { name: /Continue to Account/i });
    await user.click(continueAccountBtn);

    // STEP 3: First Account
    expect(screen.getByRole("heading", { name: "Your First Money Account" })).toBeInTheDocument();
    expect(screen.getByText("Step 3 of 4")).toBeInTheDocument();
    expect(screen.getByText("Opening Balance is Not Income")).toBeInTheDocument();

    const accNameInput = screen.getByLabelText(/Account Name/i);
    await user.type(accNameInput, "HDFC Checking");

    const balanceInput = screen.getByLabelText(/Opening Balance/i);
    await user.clear(balanceInput);
    await user.type(balanceInput, "12500");

    const reviewBtn = screen.getByRole("button", { name: /Review Setup/i });
    await user.click(reviewBtn);

    // STEP 4: Setup Summary
    expect(screen.getByRole("heading", { name: "Setup Summary" })).toBeInTheDocument();
    expect(screen.getByText("Step 4 of 4")).toBeInTheDocument();

    // Verify entered data is preserved
    expect(screen.getByText("Adarsh Sharma")).toBeInTheDocument();
    expect(screen.getByText("HDFC Checking")).toBeInTheDocument();
    expect(screen.getByText("₹12,500.00")).toBeInTheDocument();

    // Complete Setup action
    const completeBtn = screen.getByRole("button", { name: /Complete Setup/i });
    await user.click(completeBtn);

    await waitFor(() => expect(navigation.navigate).toHaveBeenCalledWith("/dashboard"));
    const posts = vi.mocked(fetch).mock.calls.filter(([, options]) => options?.method === "POST");
    expect(posts).toHaveLength(1);
    expect(JSON.parse(String(posts[0][1]?.body))).toMatchObject({
      name: "HDFC Checking",
      kind: "bank",
      opening_balance: "12500.00",
    });
    expect((posts[0][1]?.headers as Headers).get("Idempotency-Key")).toBeTruthy();
    expect(sessionStorage.getItem("kivo:onboarding:1")).toBeNull();
  });

  it("allows jumping back to edit previous steps", async () => {
    const user = userEvent.setup();
    render(<OnboardingShell />);

    // Step 1 -> Step 2
    await user.click(await screen.findByRole("button", { name: /Begin Setup/i }));

    // Step 2 -> Back to Step 1
    const backBtn = screen.getByRole("button", { name: /Back/i });
    await user.click(backBtn);

    expect(screen.getByRole("heading", { name: "Welcome to Kivo" })).toBeInTheDocument();
  });

  it("reconciles an ambiguous pending write and deliberately reuses its exact key/body", async () => {
    const body = {
      name: "HDFC Checking",
      kind: "bank",
      opened_on: "2026-10-22",
      opening_balance: "12500.00",
    };
    sessionStorage.setItem("kivo:onboarding:1", JSON.stringify({ key: "original-key", body }));
    render(<OnboardingShell />);
    const retry = await screen.findByRole("button", { name: /Retry original request/i });
    expect(retry).toBeDisabled();
    expect(
      vi.mocked(fetch).mock.calls.filter(([, options]) => options?.method === "POST")
    ).toHaveLength(0);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Check account status/i }));
    await waitFor(() => expect(retry).toBeEnabled());
    await user.dblClick(retry);
    await waitFor(() => expect(navigation.navigate).toHaveBeenCalledWith("/dashboard"));
    const posts = vi.mocked(fetch).mock.calls.filter(([, options]) => options?.method === "POST");
    expect(posts).toHaveLength(1);
    expect(JSON.parse(String(posts[0][1]?.body))).toEqual(body);
    expect((posts[0][1]?.headers as Headers).get("Idempotency-Key")).toBe("original-key");
  });

  it("shows a read failure without creating an account", async () => {
    vi.mocked(fetch).mockImplementation(async (url) =>
      String(url).includes("/auth/me/")
        ? Response.json({
            id: 1,
            name: "Test",
            email: "test@example.com",
            date_joined: "2026-10-22T00:00:00Z",
          })
        : Response.json({ error: { status_code: 503, message: "Unavailable" } }, { status: 503 })
    );
    render(<OnboardingShell />);
    expect(await screen.findByText(/cannot check your accounts/i)).toBeInTheDocument();
    expect(vi.mocked(fetch).mock.calls.some(([, options]) => options?.method === "POST")).toBe(
      false
    );
  });
});
