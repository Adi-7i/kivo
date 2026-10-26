import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import HomePage from "@/app/page";
import { Providers } from "@/app/providers";
import * as navigation from "@/features/auth/navigation";

afterEach(() => vi.restoreAllMocks());

describe("application entry (mocked Django HTTP)", () => {
  it("hides the obsolete showcase and routes a confirmed anonymous visitor to registration", async () => {
    const navigate = vi.spyOn(navigation, "navigate").mockImplementation(() => {});
    render(
      <Providers>
        <HomePage />
      </Providers>
    );

    expect(screen.getByRole("status")).toHaveTextContent("Checking your session");
    expect(screen.queryByText(/Kivo Global Design System/)).not.toBeInTheDocument();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/register"));
  });
});
