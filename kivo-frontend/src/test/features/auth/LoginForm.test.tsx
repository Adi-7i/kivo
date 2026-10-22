import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/features/auth/components/LoginForm";

describe("LoginForm component", () => {
  it("renders email and password inputs with accessible labels", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign In/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Create an account/i })).toBeInTheDocument();
  });

  it("toggles password visibility when eye button is clicked", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const passwordInput = screen.getByLabelText(/^Password/i);
    expect(passwordInput).toHaveAttribute("type", "password");

    const toggleButton = screen.getByRole("button", { name: /Show password/i });
    await user.click(toggleButton);

    expect(passwordInput).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: /Hide password/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Hide password/i }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("displays validation error when submitting empty fields", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const submitBtn = screen.getByRole("button", { name: /Sign In/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("Email address is required")).toBeInTheDocument();
      expect(screen.getByText("Password is required")).toBeInTheDocument();
    });
  });

  it("displays integration pending message when valid inputs are submitted without fake auth", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/Email address/i), "user@example.com");
    await user.type(screen.getByLabelText(/^Password/i), "CorrectPassword123");

    await user.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(
      () => {
        expect(
          screen.getByText(
            /Backend integration pending: Authentication API will be connected in Phase 3/i
          )
        ).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });
});
