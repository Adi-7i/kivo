import { describe, it, expect } from "vitest";
import { decimalPaise } from "@/features/finance/api";
import { moneyInput, calendarDate } from "@/features/finance/validation";
import { historyParams } from "@/features/transactions/history";
describe("verified financial representations (pure unit tests)", () => {
  it.each(["0.29", "1.01", "90000000000000.00"])("preserves exact money %s", (value) => {
    expect(BigInt(decimalPaise(value))).toBe(BigInt(value.replace(".", "")));
  });
  it.each(["1e3", "-1", "NaN", "0", "1.001", "90000000000000.01"])(
    "rejects unsupported amount %s",
    (value) => {
      expect(moneyInput().safeParse(value).success).toBe(false);
    }
  );
  it("validates real calendar dates", () => {
    expect(calendarDate.safeParse("2026-02-30").success).toBe(false);
    expect(calendarDate.safeParse("2024-02-29").success).toBe(true);
  });
  it("maps UI presets to server conventions and never mixes custom/preset dates", () => {
    const filters = {
      search: "Lunch",
      kind: "expense",
      accountId: "owned",
      categoryName: "category-uuid",
      datePreset: "this_week",
      sortBy: "amount_desc",
    } as const;
    expect(historyParams(filters, 2)).toMatchObject({
      period: "week",
      sort: "highest",
      category: "category-uuid",
      page: 2,
    });
    expect(
      historyParams({ ...filters, datePreset: "custom", startDate: "2026-01-01" }, 1)
    ).toMatchObject({ period: undefined, date_from: "2026-01-01" });
  });
});
