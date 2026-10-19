import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OnboardingShell } from "@/features/onboarding/components/OnboardingShell";

describe("OnboardingShell multi-step flow", () => {
  it("progresses smoothly through all 4 onboarding steps preserving entered state", async () => {
    const user = userEvent.setup();
    render(<OnboardingShell />);

    // STEP 1: Welcome
    expect(screen.getByRole("heading", { name: "Welcome to Kivo" })).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();

    const beginBtn = screen.getByRole("button", { name: /Begin Setup/i });
    await user.click(beginBtn);

    // STEP 2: Personal Setup
    expect(screen.getByRole("heading", { name: "Personal Setup" })).toBeInTheDocument();
    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/Display Name/i);
    await user.type(nameInput, "Adarsh Sharma");

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

    await waitFor(
      () => {
        expect(
          screen.getByText(
            /Backend integration pending: Submitting setup will post opening account entries/i
          )
        ).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it("allows jumping back to edit previous steps", async () => {
    const user = userEvent.setup();
    render(<OnboardingShell />);

    // Step 1 -> Step 2
    await user.click(screen.getByRole("button", { name: /Begin Setup/i }));

    // Step 2 -> Back to Step 1
    const backBtn = screen.getByRole("button", { name: /Back/i });
    await user.click(backBtn);

    expect(screen.getByRole("heading", { name: "Welcome to Kivo" })).toBeInTheDocument();
  });
});
