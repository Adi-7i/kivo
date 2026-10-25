import { describe, it, expect } from "vitest";
import { csvExportSchema } from "@/features/reports/schemas/export.schema";
describe("CSV export input", () => {
  it("accepts dates with all owned records by default", () =>
    expect(csvExportSchema.parse({ startDate: "2026-10-01", endDate: "2026-10-31" })).toEqual({
      startDate: "2026-10-01",
      endDate: "2026-10-31",
      accountId: "",
      category: "",
      transactionType: "",
    }));
  it.each([
    { startDate: "2026-11-01", endDate: "2026-10-31" },
    { startDate: "2027-02-29", endDate: "2027-03-01" },
    { startDate: "invalid", endDate: "2026-10-31" },
    { startDate: "2026-10-01", endDate: "2026-10-31", accountId: "fake-account" },
    { startDate: "2026-10-01", endDate: "2026-10-31", transactionType: "income" },
  ])("rejects unsupported export selection %j", (value) =>
    expect(csvExportSchema.safeParse(value).success).toBe(false)
  );
});
