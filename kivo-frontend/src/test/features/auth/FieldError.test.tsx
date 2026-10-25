import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FieldError } from "@/features/auth/components/FieldError";

describe("shared validation error presentation", () => {
  it("announces a message supplied by financial forms", () => {
    render(<FieldError message="Amount must be greater than zero" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Amount must be greater than zero");
  });
  it("preserves the existing error prop and accessible description ID", () => {
    render(<FieldError id="amount-error" error="Select an owned account" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Select an owned account");
    expect(screen.getByRole("alert")).toHaveAttribute("id", "amount-error");
  });
  it("renders no empty alert when neither prop has a message", () => {
    render(<FieldError />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
