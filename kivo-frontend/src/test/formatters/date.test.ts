import { describe, it, expect } from "vitest";
import {
  parseDateOnly,
  formatDateDisplay,
  formatDateTimeDisplay,
  formatMonthYear,
} from "@/lib/formatters/date";

describe("parseDateOnly and formatDateDisplay", () => {
  it("faithfully parses date-only strings without timezone day shifts", () => {
    const parsed = parseDateOnly("2026-10-17");
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(9); // 0-indexed October
    expect(parsed.getDate()).toBe(17);
  });

  it("formats date-only strings into readable display format", () => {
    expect(formatDateDisplay("2026-10-17")).toBe("17 Oct 2026");
    expect(formatDateDisplay("2026-01-01", "dd/MM/yyyy")).toBe("01/01/2026");
  });

  it("formats month and year correctly", () => {
    expect(formatMonthYear("2026-10-17")).toBe("October 2026");
  });

  it("throws on invalid date string format", () => {
    expect(() => parseDateOnly("17-10-2026")).toThrow();
    expect(() => parseDateOnly("invalid-date")).toThrow();
    expect(() => parseDateOnly("2026-02-31")).toThrow(); // Invalid calendar day
  });
});

describe("formatDateTimeDisplay", () => {
  it("formats ISO datetime string", () => {
    const formatted = formatDateTimeDisplay("2026-10-17T14:30:00Z");
    expect(formatted).toContain("2026");
    expect(formatted).toContain("Oct");
  });

  it("throws on invalid datetime string", () => {
    expect(() => formatDateTimeDisplay("not-a-datetime")).toThrow();
  });
});
