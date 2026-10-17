import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";
import { Providers } from "@/app/providers";

describe("HomePage & Providers integration", () => {
  it("renders HomePage without throwing within Providers", () => {
    render(
      <Providers>
        <HomePage />
      </Providers>
    );

    // Verify presence of main headings and preview indicators
    expect(screen.getByRole("heading", { name: "Kivo Global Design System" })).toBeInTheDocument();

    expect(
      screen.getByText("Frontend Phase 1: Foundation & Architecture Ready")
    ).toBeInTheDocument();
    expect(screen.getByText("Color Palette & Financial Semantics")).toBeInTheDocument();
    expect(screen.getByText("shadcn/ui Foundation Primitives")).toBeInTheDocument();
  });
});
