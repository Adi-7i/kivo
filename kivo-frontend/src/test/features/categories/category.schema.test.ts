import { describe, it, expect } from "vitest";
import { categorySchema } from "@/features/categories/schemas/category.schema";

describe("categorySchema", () => {
  it("validates valid category input", () => {
    const valid = {
      name: "Food & Groceries",
      color: "#3A5A40",
      icon: "Utensils",
      isExpense: true,
    };
    const result = categorySchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Food & Groceries");
      expect(result.data.color).toBe("#3A5A40");
      expect(result.data.isExpense).toBe(true);
    }
  });

  it("trims whitespace from name", () => {
    const input = {
      name: "  Transport & Fuel  ",
      color: "#344E41",
      isExpense: true,
    };
    const result = categorySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Transport & Fuel");
    }
  });

  it("rejects names shorter than 2 characters", () => {
    const input = {
      name: "A",
      isExpense: true,
    };
    const result = categorySchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects invalid hex colors", () => {
    const input = {
      name: "Housing",
      color: "blue",
      isExpense: true,
    };
    const result = categorySchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("applies defaults for color and icon", () => {
    const input = {
      name: "Entertainment",
    };
    const result = categorySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.color).toBe("#3A5A40");
      expect(result.data.icon).toBe("Tag");
      expect(result.data.isExpense).toBe(true);
    }
  });
});
