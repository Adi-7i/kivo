import { describe, it, expect } from "vitest";
import { accountManageSchema } from "@/features/accounts/schemas/account-manage.schema";

describe("accountManageSchema", () => {
  it("passes validation for a valid bank account", () => {
    const validData = {
      name: "Kotak Mahindra Savings",
      kind: "bank",
      openingBalance: "12500.50",
      openedOn: "2026-03-15",
    };
    const result = accountManageSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("passes validation for cash with zero opening balance", () => {
    const validData = {
      name: "Emergency Cash Drawer",
      kind: "cash",
      openingBalance: "0",
      openedOn: "2026-03-15",
    };
    const result = accountManageSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("fails when name is shorter than 2 characters", () => {
    const invalidData = {
      name: "A",
      kind: "bank",
      openingBalance: "1000",
      openedOn: "2026-03-15",
    };
    const result = accountManageSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("fails for unsupported account kind", () => {
    const invalidData = {
      name: "Crypto Account",
      kind: "crypto",
      openingBalance: "1000",
      openedOn: "2026-03-15",
    };
    const result = accountManageSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("fails for negative opening balance or invalid decimal", () => {
    const negative = {
      name: "Bank Account",
      kind: "bank",
      openingBalance: "-500.00",
      openedOn: "2026-03-15",
    };
    expect(accountManageSchema.safeParse(negative).success).toBe(false);

    const invalidDecimal = {
      name: "Bank Account",
      kind: "bank",
      openingBalance: "500.999",
      openedOn: "2026-03-15",
    };
    expect(accountManageSchema.safeParse(invalidDecimal).success).toBe(false);
  });
});
