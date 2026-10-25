import { describe, it, expect } from "vitest";
import { budgetSchema } from "@/features/budgets/schemas/budget.schema";
import { monthBounds } from "@/features/budgets/api";
const valid = {
  name: "Monthly",
  type: "overall",
  amount: "0",
  periodType: "monthly",
  period: "2026-10",
  start: "",
  end: "",
  category: "",
  warning: "80",
  archived: false,
};
describe("verified budget inputs", () => {
  it("accepts nonnegative limits including zero", () =>
    expect(budgetSchema.safeParse(valid).success).toBe(true));
  it("accepts an owned UUID category", () =>
    expect(
      budgetSchema.safeParse({
        ...valid,
        type: "category",
        category: "00000000-0000-4000-8000-000000000001",
        amount: "0.29",
      }).success
    ).toBe(true));
  it.each([
    { type: "category", category: "Food" },
    { amount: "-1" },
    { amount: "0.001" },
    { amount: "90000000000000.01" },
    { warning: "0" },
    { warning: "101" },
    { warning: "80.5" },
    { period: "2026-13" },
    { period: "0000-01" },
  ])("rejects invalid input %j", (changes) =>
    expect(budgetSchema.safeParse({ ...valid, ...changes }).success).toBe(false)
  );
  it("supports inclusive custom dates but rejects invalid dates and descending ranges", () => {
    expect(
      budgetSchema.safeParse({
        ...valid,
        periodType: "custom",
        start: "2028-02-01",
        end: "2028-02-29",
      }).success
    ).toBe(true);
    expect(
      budgetSchema.safeParse({
        ...valid,
        periodType: "custom",
        start: "2027-02-01",
        end: "2027-02-29",
      }).success
    ).toBe(false);
    expect(
      budgetSchema.safeParse({
        ...valid,
        periodType: "custom",
        start: "2028-03-01",
        end: "2028-02-29",
      }).success
    ).toBe(false);
  });
  it("uses calendar boundaries for form input, including leap February", () => {
    expect(monthBounds("2028-02")).toEqual({ start: "2028-02-01", end: "2028-02-29" });
    expect(monthBounds("2027-02")).toEqual({ start: "2027-02-01", end: "2027-02-28" });
  });
});
