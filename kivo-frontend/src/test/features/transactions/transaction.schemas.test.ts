import { describe, it, expect } from "vitest";
import { expenseSchema } from "@/features/transactions/schemas/expense.schema";
import { receiptSchema } from "@/features/transactions/schemas/receipt.schema";
import { transferSchema } from "@/features/transactions/schemas/transfer.schema";

describe("expenseSchema", () => {
  it("validates valid expense transaction", () => {
    const valid = {
      amount: "450.50",
      title: "Grocery Essentials",
      categoryName: "Food & Groceries",
      accountId: "acc-1",
      effectiveDate: "2026-10-17",
      merchant: "Zepto",
    };
    expect(expenseSchema.safeParse(valid).success).toBe(true);
  });

  it("fails when expense amount is zero or negative", () => {
    const zeroAmount = {
      amount: "0",
      title: "Free snack",
      categoryName: "Food",
      accountId: "acc-1",
      effectiveDate: "2026-10-17",
    };
    expect(expenseSchema.safeParse(zeroAmount).success).toBe(false);
  });

  it("fails when required fields are missing", () => {
    const missing = {
      amount: "100",
      title: "",
      categoryName: "",
      accountId: "",
      effectiveDate: "invalid-date",
    };
    expect(expenseSchema.safeParse(missing).success).toBe(false);
  });
});

describe("receiptSchema", () => {
  it("validates incoming money receipt", () => {
    const valid = {
      amount: "50000",
      title: "Client Retainer",
      fundingSource: "Client",
      accountId: "acc-bank-1",
      effectiveDate: "2026-10-17",
    };
    expect(receiptSchema.safeParse(valid).success).toBe(true);
  });

  it("fails when title is too short", () => {
    const shortTitle = {
      amount: "50000",
      title: "A",
      accountId: "acc-bank-1",
      effectiveDate: "2026-10-17",
    };
    expect(receiptSchema.safeParse(shortTitle).success).toBe(false);
  });
});

describe("transferSchema", () => {
  it("validates own account transfer between distinct accounts", () => {
    const valid = {
      amount: "2000",
      fromAccountId: "acc-bank-1",
      toAccountId: "acc-cash-1",
      effectiveDate: "2026-10-17",
      notes: "ATM withdrawal",
    };
    expect(transferSchema.safeParse(valid).success).toBe(true);
  });

  it("fails when source and destination accounts are identical", () => {
    const identicalAccounts = {
      amount: "2000",
      fromAccountId: "acc-bank-1",
      toAccountId: "acc-bank-1",
      effectiveDate: "2026-10-17",
    };
    const result = transferSchema.safeParse(identicalAccounts);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("different"))).toBe(true);
    }
  });
});
