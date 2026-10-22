import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContactAvatar } from "@/features/people/components/ContactAvatar";

describe("ContactAvatar", () => {
  it("renders 2-letter initials for first and last name", () => {
    render(<ContactAvatar name="Rohan Sharma" />);
    expect(screen.getByText("RS")).toBeInTheDocument();
    expect(screen.getByLabelText("Avatar for Rohan Sharma")).toBeInTheDocument();
  });

  it("renders 2-letter initials for single word name", () => {
    render(<ContactAvatar name="Priya" />);
    expect(screen.getByText("PR")).toBeInTheDocument();
  });

  it("handles multi-word names by taking first and last initials", () => {
    render(<ContactAvatar name="Vikram Kumar Malhotra" />);
    expect(screen.getByText("VM")).toBeInTheDocument();
  });

  it("applies different size classes appropriately", () => {
    const { container } = render(<ContactAvatar name="Ananya Iyer" size="lg" />);
    expect(container.firstChild).toHaveClass("size-14");
  });
});
