import { describe, it, expect } from "vitest";
import { loanSchema } from "@/features/lending/schemas/loan.schema";
import { settlementSchema } from "@/features/lending/schemas/settlement.schema";

describe("loanSchema", () => {
  it("validates valid lending form data", () => {
    const result = loanSchema.safeParse({
      kind: "lend",
      contactId: "00000000-0000-4000-8000-000000000001",
      accountId: "00000000-0000-4000-8000-000000000003",
      amount: "2500.00",
      effectiveDate: "2026-10-20",
      title: "Grocery advance",
      notes: "Will settle Friday",
      paymentMethod: "UPI",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kind).toBe("lend");
      expect(result.data.amount).toBe("2500.00");
    }
  });

  it("validates valid borrowing form data", () => {
    const result = loanSchema.safeParse({
      kind: "borrow",
      contactId: "00000000-0000-4000-8000-000000000002",
      accountId: "00000000-0000-4000-8000-000000000003",
      amount: "1200",
      effectiveDate: "2026-10-20",
      title: "Emergency cab assistance",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kind).toBe("borrow");
    }
  });

  it("fails when amount is zero or negative", () => {
    const result = loanSchema.safeParse({
      kind: "lend",
      contactId: "00000000-0000-4000-8000-000000000001",
      accountId: "00000000-0000-4000-8000-000000000003",
      amount: "0",
      effectiveDate: "2026-10-20",
      title: "Advance",
    });
    expect(result.success).toBe(false);
  });

  it("fails when contactId is missing", () => {
    const result = loanSchema.safeParse({
      kind: "lend",
      contactId: "",
      accountId: "00000000-0000-4000-8000-000000000003",
      amount: "500",
      effectiveDate: "2026-10-20",
      title: "Advance",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Please select a friend or contact");
    }
  });
});

describe("settlementSchema", () => {
  it("validates valid settlement form data", () => {
    const result = settlementSchema.safeParse({
      claimId: "00000000-0000-4000-8000-000000000004",
      accountId: "00000000-0000-4000-8000-000000000003",
      amount: "1500.00",
      effectiveDate: "2026-10-20",
      title: "Repayment received from Rohan",
      paymentMethod: "UPI",
    });
    expect(result.success).toBe(true);
  });

  it("fails when claimId is missing", () => {
    const result = settlementSchema.safeParse({
      claimId: "",
      accountId: "00000000-0000-4000-8000-000000000003",
      amount: "1000",
      effectiveDate: "2026-10-20",
      title: "Repayment",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Please select an active claim to settle");
    }
  });
});
