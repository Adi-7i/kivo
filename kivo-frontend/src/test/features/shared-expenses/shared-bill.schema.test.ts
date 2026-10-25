import { describe, it, expect } from "vitest";
import { sharedBillSchema } from "@/features/shared-expenses/schemas/shared-bill.schema";

describe("sharedBillSchema", () => {
  const validUserPaidData = {
    title: "Flat Groceries & Cleaning",
    amount: "2400.00",
    category: "00000000-0000-4000-8000-000000000005",
    effectiveDate: "2026-10-15",
    payerType: "user" as const,
    accountId: "00000000-0000-4000-8000-000000000003",
    splitMethod: "equal" as const,
    selectedParticipants: ["00000000-0000-4000-8000-000000000001"],
    merchant: "SuperMart",
    notes: "Monthly staples",
  };

  const validFriendPaidData = {
    title: "Dinner at Bistro",
    amount: "1850",
    category: "00000000-0000-4000-8000-000000000005",
    effectiveDate: "2026-10-14",
    payerType: "friend" as const,
    payerContactId: "00000000-0000-4000-8000-000000000002",
    splitMethod: "equal" as const,
    selectedParticipants: ["00000000-0000-4000-8000-000000000002"],
    merchant: "The Bistro",
  };

  it("validates successfully when user pays from an account", () => {
    const result = sharedBillSchema.safeParse(validUserPaidData);
    expect(result.success).toBe(true);
  });

  it("validates successfully when friend pays", () => {
    const result = sharedBillSchema.safeParse(validFriendPaidData);
    expect(result.success).toBe(true);
  });

  it("fails if payerType is 'user' but accountId is missing or blank", () => {
    const invalid = { ...validUserPaidData, accountId: "" };
    const result = sharedBillSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/owned payment account/i);
    }
  });

  it("fails if payerType is 'friend' but payerContactId is missing or blank", () => {
    const invalid = { ...validFriendPaidData, payerContactId: "" };
    const result = sharedBillSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/selected participant/i);
    }
  });

  it("fails if amount is zero or negative", () => {
    const zeroResult = sharedBillSchema.safeParse({ ...validUserPaidData, amount: "0" });
    expect(zeroResult.success).toBe(false);

    const negativeResult = sharedBillSchema.safeParse({ ...validUserPaidData, amount: "-500" });
    expect(negativeResult.success).toBe(false);
  });

  it("fails if title is less than 2 characters", () => {
    const result = sharedBillSchema.safeParse({ ...validUserPaidData, title: "A" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/at least 2 characters/i);
    }
  });

  it("fails if effectiveDate does not match YYYY-MM-DD format", () => {
    const result = sharedBillSchema.safeParse({
      ...validUserPaidData,
      effectiveDate: "15/10/2026",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/YYYY-MM-DD/i);
    }
  });

  it("permits owner-only participants as supported by Django", () => {
    expect(
      sharedBillSchema.safeParse({ ...validUserPaidData, selectedParticipants: [] }).success
    ).toBe(true);
  });
});
