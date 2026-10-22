import { describe, it, expect } from "vitest";
import { csvExportSchema } from "@/features/reports/schemas/export.schema";

describe("csvExportSchema", () => {
  it("validates proper date range and defaults", () => {
    const input = {
      startDate: "2026-10-01",
      endDate: "2026-10-31",
      accountId: "all",
      category: "all",
    };
    const result = csvExportSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.includeHeaders).toBe(true);
    }
  });

  it("rejects when startDate is after endDate", () => {
    const input = {
      startDate: "2026-11-01",
      endDate: "2026-10-31",
    };
    const result = csvExportSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("endDate");
    }
  });

  it("rejects non-date string format", () => {
    const input = {
      startDate: "invalid-date",
      endDate: "2026-10-31",
    };
    const result = csvExportSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
