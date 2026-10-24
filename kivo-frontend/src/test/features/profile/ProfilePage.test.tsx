import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders as render } from "@/test/utils/render";
import { ProfilePage } from "@/features/profile/components/ProfilePage";

describe("ProfilePage component", () => {
  beforeEach(() =>
    vi
      .mocked(fetch)
      .mockResolvedValue(
        Response.json({
          id: 1,
          name: "Component Test",
          email: "component@example.com",
          date_joined: "2026-10-22T00:00:00Z",
        })
      )
  );
  it("renders the authenticated profile returned by mocked HTTP", async () => {
    render(<ProfilePage />);
    expect(await screen.findByText("Your Profile")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("Component Test")).toBeInTheDocument();
    expect(screen.getByText("component@example.com")).toBeInTheDocument();
  });

  it("renders regional standards and security information", async () => {
    render(<ProfilePage />);

    expect(await screen.findByText("Personal Information")).toBeInTheDocument();
    expect(screen.getByText("Regional & Currency Standards")).toBeInTheDocument();
    expect(screen.getByText(/INR \(₹\) • Paise Integer/i)).toBeInTheDocument();
    expect(screen.getByText(/Asia\/Kolkata \(IST\)/i)).toBeInTheDocument();
    expect(screen.getByText("Security & Audit Trail")).toBeInTheDocument();
  });

  it("disables unsupported profile and password mutations", async () => {
    render(<ProfilePage />);

    const updateBtn = await screen.findByRole("button", { name: /Update Profile Details/i });
    expect(updateBtn).toBeDisabled();
    expect(screen.getByRole("button", { name: /Change Password/i })).toBeDisabled();
    expect(screen.getByLabelText(/Full Name/i)).toHaveValue("Component Test");
  });
});
