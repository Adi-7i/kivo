import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders as render } from "@/test/utils/render";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/features/auth/components/LoginForm";
import * as navigation from "@/features/auth/navigation";

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

  it("maps a mocked Django invalid-credentials response without navigating", async () => {
    const navigate = vi.spyOn(navigation, "navigate").mockImplementation(() => {});
    vi.mocked(fetch).mockResolvedValue(
      Response.json(
        {
          error: {
            status_code: 400,
            type: "validation_error",
            details: { detail: ["Unable to log in with provided credentials."] },
          },
        },
        { status: 400 }
      )
    );
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/Email address/i), "user@example.com");
    await user.type(screen.getByLabelText(/^Password/i), "CorrectPassword123");

    await user.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(
      () => {
        expect(screen.getByText(/Unable to log in with provided credentials/i)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
    expect(navigate).not.toHaveBeenCalled();
    navigate.mockRestore();
  });

  it("navigates a confirmed first-time login to onboarding and clears private cached data", async () => {
    const navigate = vi.spyOn(navigation, "navigate").mockImplementation(() => {});
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        Response.json({
          id: 1,
          name: "Test",
          email: "user@example.com",
          date_joined: "2026-10-22T00:00:00Z",
        })
      )
      .mockResolvedValueOnce(Response.json({ count: 0, next: null, previous: null, results: [] }));
    const { queryClient } = render(<LoginForm />);
    queryClient.setQueryData(["private", 99], { secret: "old-user-data" });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Email address/i), "user@example.com");
    await user.type(screen.getByLabelText(/^Password/i), "CorrectPassword123");
    await user.click(screen.getByRole("button", { name: /Sign In/i }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/onboarding"));
    expect(queryClient.getQueryData(["private", 99])).toBeUndefined();
    navigate.mockRestore();
  });
});
