import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfilePage } from "@/features/profile/components/ProfilePage";

describe("ProfilePage component", () => {
  it("renders profile header in preview mode without fabricated identity", () => {
    render(<ProfilePage />);

    expect(screen.getByText("User Profile UI Preview")).toBeInTheDocument();
    expect(screen.getByText("Preview Mode")).toBeInTheDocument();
    expect(screen.getByText("Unconnected Profile")).toBeInTheDocument();
    expect(screen.getByText("No authenticated session")).toBeInTheDocument();
  });

  it("renders regional standards and security information", () => {
    render(<ProfilePage />);

    expect(screen.getByText("Personal Information")).toBeInTheDocument();
    expect(screen.getByText("Regional & Currency Standards")).toBeInTheDocument();
    expect(screen.getByText(/INR \(₹\) • Paise Integer/i)).toBeInTheDocument();
    expect(screen.getByText(/Asia\/Kolkata \(IST\)/i)).toBeInTheDocument();
    expect(screen.getByText("Security & Audit Trail")).toBeInTheDocument();
  });

  it("displays integration pending badge when user attempts to update profile", async () => {
    const user = userEvent.setup();
    render(<ProfilePage />);

    const updateBtn = screen.getByRole("button", { name: /Update Profile Details/i });
    await user.click(updateBtn);

    expect(
      screen.getByText(
        /Backend integration pending: Profile mutations and preference updates will connect/i
      )
    ).toBeInTheDocument();
  });
});
