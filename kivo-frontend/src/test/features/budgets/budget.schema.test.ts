import { describe, it, expect } from "vitest";
import { budgetSchema } from "@/features/budgets/schemas/budget.schema";

describe("budgetSchema", () => {
  it("validates a proper overall budget", () => {
    const input = {
      type: "overall",
      amount: "65000",
      period: "2026-10",
      notes: "Overall cap for October",
    };
    const result = budgetSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("validates a proper category budget", () => {
    const input = {
      type: "category",
      category: "Food & Groceries",
      amount: "18000.50",
      period: "2026-10",
      notes: "Supermarket groceries",
    };
    const result = budgetSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects a category budget missing category name", () => {
    const input = {
      type: "category",
      category: "",
      amount: "15000",
      period: "2026-10",
    };
    const result = budgetSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("category");
    }
  });

  it("rejects non-positive or zero amount", () => {
    const input = {
      type: "overall",
      amount: "0",
      period: "2026-10",
    };
    const result = budgetSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects negative amount", () => {
    const input = {
      type: "overall",
      amount: "-500",
      period: "2026-10",
    };
    const result = budgetSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects invalid period format", () => {
    const input = {
      type: "overall",
      amount: "5000",
      period: "October 2026",
    };
    const result = budgetSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("period");
    }
  });
});
