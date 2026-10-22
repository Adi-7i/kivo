import { describe, it, expect } from "vitest";
import { accountSchema } from "@/features/onboarding/schemas/account.schema";

describe("accountSchema", () => {
  it("passes validation with valid bank account parameters", () => {
    const validData = {
      accountName: "HDFC Salary Account",
      accountType: "bank",
      openingBalance: "25000.50",
      openingDate: "2026-10-17",
    };
    const result = accountSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("passes validation with zero opening balance", () => {
    const validData = {
      accountName: "Emergency Cash",
      accountType: "cash",
      openingBalance: "0",
      openingDate: "2026-10-17",
    };
    const result = accountSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("fails when account name is too short", () => {
    const invalidData = {
      accountName: "A",
      accountType: "bank",
      openingBalance: "1000",
      openingDate: "2026-10-17",
    };
    const result = accountSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("fails when account type is unrecognized", () => {
    const invalidData = {
      accountName: "Crypto Account",
      accountType: "crypto",
      openingBalance: "1000",
      openingDate: "2026-10-17",
    };
    const result = accountSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("fails when opening balance has negative value or invalid decimal format", () => {
    const negativeData = {
      accountName: "Checking",
      accountType: "bank",
      openingBalance: "-500",
      openingDate: "2026-10-17",
    };
    expect(accountSchema.safeParse(negativeData).success).toBe(false);

    const threeDecimals = {
      accountName: "Checking",
      accountType: "bank",
      openingBalance: "100.555",
      openingDate: "2026-10-17",
    };
    expect(accountSchema.safeParse(threeDecimals).success).toBe(false);
  });

  it("fails when opening date format is invalid", () => {
    const badDate = {
      accountName: "Checking",
      accountType: "bank",
      openingBalance: "1000",
      openingDate: "17-10-2026",
    };
    expect(accountSchema.safeParse(badDate).success).toBe(false);
  });
});
