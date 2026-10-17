import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

describe("RegisterForm component", () => {
  it("renders all registration inputs and live guidelines", () => {
    render(<RegisterForm />);

    expect(screen.getByLabelText(/Full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm password/i)).toBeInTheDocument();
    expect(screen.getByText(/At least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create Account/i })).toBeInTheDocument();
  });

  it("shows error when passwords do not match", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.type(screen.getByLabelText(/Full name/i), "Adarsh Sharma");
    await user.type(screen.getByLabelText(/Email address/i), "adarsh@example.com");
    await user.type(screen.getByLabelText(/^Password/i), "Password123");
    await user.type(screen.getByLabelText(/Confirm password/i), "DifferentPass123");

    await user.click(screen.getByRole("button", { name: /Create Account/i }));

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });
  });

  it("submits valid form and displays backend pending banner without fake account creation", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.type(screen.getByLabelText(/Full name/i), "Adarsh Sharma");
    await user.type(screen.getByLabelText(/Email address/i), "adarsh@example.com");
    await user.type(screen.getByLabelText(/^Password/i), "SecurePass123");
    await user.type(screen.getByLabelText(/Confirm password/i), "SecurePass123");

    await user.click(screen.getByRole("button", { name: /Create Account/i }));

    await waitFor(
      () => {
        expect(
          screen.getByText(/Backend integration pending: Account registration API will be connected in Phase 3/i)
        ).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });
});
