import { describe, it, expect, vi } from "vitest";
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
    expect(screen.getByText(/At least 10 characters/i)).toBeInTheDocument();
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

  it("shows confirmed registration only after a mocked HTTP 201 and offers explicit login", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json(
        {
          id: 1,
          name: "Adarsh Sharma",
          email: "adarsh@example.com",
          date_joined: "2026-10-22T00:00:00Z",
        },
        { status: 201 }
      )
    );
    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.type(screen.getByLabelText(/Full name/i), "Adarsh Sharma");
    await user.type(screen.getByLabelText(/Email address/i), "adarsh@example.com");
    await user.type(screen.getByLabelText(/^Password/i), "SecurePass123");
    await user.type(screen.getByLabelText(/Confirm password/i), "SecurePass123");

    await user.click(screen.getByRole("button", { name: /Create Account/i }));

    await waitFor(
      () => {
        expect(screen.getByText(/Your account was created/i)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
    expect(screen.getByRole("link", { name: /Sign in to continue/i })).toHaveAttribute(
      "href",
      "/login"
    );
    expect(screen.getByLabelText(/^Password/i)).toHaveValue("");
    expect(screen.getByRole("button", { name: /Create Account/i })).toBeDisabled();
  });

  it("maps a duplicate email from the nested Django error envelope", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json(
        {
          error: {
            status_code: 400,
            type: "validation_error",
            details: { email: ["A user with this email address already exists."] },
          },
        },
        { status: 400 }
      )
    );
    const user = userEvent.setup();
    render(<RegisterForm />);
    await user.type(screen.getByLabelText(/Full name/i), "Test Identity");
    await user.type(screen.getByLabelText(/Email address/i), "duplicate@example.com");
    await user.type(screen.getByLabelText(/^Password/i), "UniquePassword123!");
    await user.type(screen.getByLabelText(/Confirm password/i), "UniquePassword123!");
    await user.click(screen.getByRole("button", { name: /Create Account/i }));
    expect(
      await screen.findByText("A user with this email address already exists.")
    ).toBeInTheDocument();
  });
});
