import { describe, it, expect } from "vitest";
import {
  formatInr,
  parseDecimalStringToPaise,
  paiseToDecimalString,
} from "@/lib/formatters/currency";

describe("formatInr", () => {
  it("formats zero paise correctly", () => {
    expect(formatInr(0)).toBe("₹0.00");
  });

  it("formats standard amounts with Indian grouping (lakhs)", () => {
    expect(formatInr(123456)).toBe("₹1,234.56");
    expect(formatInr(10000000)).toBe("₹1,00,000.00"); // 1 lakh INR
    expect(formatInr(1000000000)).toBe("₹1,00,00,000.00"); // 1 crore INR
  });

  it("formats single digit paise with leading zero", () => {
    expect(formatInr(105)).toBe("₹1.05");
    expect(formatInr(7)).toBe("₹0.07");
  });

  it("formats negative amounts with correct sign placement", () => {
    expect(formatInr(-5050)).toBe("-₹50.50");
  });

  it("supports optional showSymbol and showSign options", () => {
    expect(formatInr(150000, { showSymbol: false })).toBe("1,500.00");
    expect(formatInr(150000, { showSign: true })).toBe("+₹1,500.00");
  });

  it("strictly throws if non-integer is passed", () => {
    expect(() => formatInr(123.45)).toThrow(TypeError);
    expect(() => formatInr(NaN)).toThrow(TypeError);
  });
});

describe("parseDecimalStringToPaise", () => {
  it("converts standard decimal string to paise", () => {
    expect(parseDecimalStringToPaise("1234.56")).toBe(123456);
    expect(parseDecimalStringToPaise("0.05")).toBe(5);
    expect(parseDecimalStringToPaise("500")).toBe(50000);
  });

  it("handles commas and currency symbols", () => {
    expect(parseDecimalStringToPaise("₹1,23,456.78")).toBe(12345678);
    expect(parseDecimalStringToPaise("  ₹50.00  ")).toBe(5000);
  });

  it("handles negative amounts", () => {
    expect(parseDecimalStringToPaise("-100.5")).toBe(-10050);
    expect(parseDecimalStringToPaise("-₹25.75")).toBe(-2575);
  });

  it("throws on invalid string or excess decimal precision", () => {
    expect(() => parseDecimalStringToPaise("")).toThrow();
    expect(() => parseDecimalStringToPaise("abc")).toThrow();
    expect(() => parseDecimalStringToPaise("12.345")).toThrow();
  });
});

describe("paiseToDecimalString", () => {
  it("converts integer paise to exact 2-decimal string", () => {
    expect(paiseToDecimalString(123456)).toBe("1234.56");
    expect(paiseToDecimalString(5)).toBe("0.05");
    expect(paiseToDecimalString(-10050)).toBe("-100.50");
  });

  it("throws on non-integer input", () => {
    expect(() => paiseToDecimalString(12.34 as unknown as number)).toThrow(TypeError);
  });
});
