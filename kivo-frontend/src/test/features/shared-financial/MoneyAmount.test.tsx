import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";

describe("MoneyAmount component", () => {
  it("formats standard integer paise into Indian Rupee presentation", () => {
    render(<MoneyAmount paise={123456} />);
    expect(screen.getByText("₹1,234.56")).toBeInTheDocument();
  });

  it("handles zero paise correctly", () => {
    render(<MoneyAmount paise={0} />);
    expect(screen.getByText("₹0.00")).toBeInTheDocument();
  });

  it("formats negative amounts with minus sign", () => {
    render(<MoneyAmount paise={-45000} />);
    expect(screen.getByText("-₹450.00")).toBeInTheDocument();
  });

  it("shows plus sign when showSign is enabled for positive values", () => {
    render(<MoneyAmount paise={500000} showSign />);
    expect(screen.getByText("+₹5,000.00")).toBeInTheDocument();
  });

  it("omits symbol when showSymbol is false", () => {
    render(<MoneyAmount paise={7500} showSymbol={false} />);
    expect(screen.getByText("75.00")).toBeInTheDocument();
  });
});
