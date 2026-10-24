import { describe, it, expect } from "vitest";
import { categorySchema } from "@/features/categories/schemas/category.schema";

describe("categorySchema", () => {
  it("validates valid category input", () => {
    const valid = {
      name: "Food & Groceries",
      parent: "00000000-0000-4000-8000-000000000001",
      archived: false,
    };
    const result = categorySchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Food & Groceries");
      expect(result.data.parent).toBe(valid.parent);
      expect(result.data.archived).toBe(false);
    }
  });

  it("trims whitespace from name", () => {
    const input = {
      name: "  Transport & Fuel  ",
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
    };
    const result = categorySchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects unsupported color/classification fields", () => {
    const input = {
      name: "Housing",
      color: "blue",
      isExpense: true,
    };
    const result = categorySchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("applies only supported parent and archival defaults", () => {
    const input = {
      name: "Entertainment",
    };
    const result = categorySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.parent).toBe("");
      expect(result.data.archived).toBe(false);
    }
  });
});
