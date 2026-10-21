import { describe, it, expect } from "vitest";
import { rentPlanSchema } from "@/features/rent/schemas/rent-plan.schema";
import { rentPaymentSchema } from "@/features/rent/schemas/rent-payment.schema";
import {
  createReserveSchema,
  adjustReserveSchema,
} from "@/features/rent/schemas/rent-reserve.schema";
import { obligationActionSchema } from "@/features/rent/schemas/obligation-action.schema";

describe("Rent Schemas", () => {
  describe("rentPlanSchema", () => {
    const validPlan = {
      title: "Apartment 4B Lease",
      payee: "Ramesh Sharma (Landlord)",
      startDate: "2026-04-01",
      dueDayRule: "fixed_day" as const,
      dueDay: 5,
      amount: "28000.00",
      isShared: true,
      splitMethod: "equal" as const,
      roommateContactIds: ["c-rohan-1"],
      active: true,
    };

    it("validates a standard rent plan configuration", () => {
      const result = rentPlanSchema.safeParse(validPlan);
      expect(result.success).toBe(true);
    });

    it("rejects rent plan with zero or negative rent amount", () => {
      const result = rentPlanSchema.safeParse({ ...validPlan, amount: "0" });
      expect(result.success).toBe(false);
    });

    it("rejects rent plan with invalid date format", () => {
      const result = rentPlanSchema.safeParse({ ...validPlan, startDate: "01/04/2026" });
      expect(result.success).toBe(false);
    });

    it("rejects title shorter than 2 characters", () => {
      const result = rentPlanSchema.safeParse({ ...validPlan, title: "A" });
      expect(result.success).toBe(false);
    });
  });

  describe("rentPaymentSchema", () => {
    const validOwnerPayment = {
      obligationId: "ro-2026-10",
      payerType: "owner" as const,
      accountId: "acc-hdfc-1",
      amount: "14000.00",
      effectiveDate: "2026-10-04",
      title: "October Rent Share",
      paymentMethod: "UPI",
    };

    const validFriendPayment = {
      obligationId: "ro-2026-10",
      payerType: "friend" as const,
      payerContactId: "c-rohan-1",
      amount: "28000.00",
      effectiveDate: "2026-10-04",
      title: "October Rent (Rohan paid full)",
    };

    it("validates owner payment with an account selected", () => {
      const result = rentPaymentSchema.safeParse(validOwnerPayment);
      expect(result.success).toBe(true);
    });

    it("validates roommate payment with contact selected", () => {
      const result = rentPaymentSchema.safeParse(validFriendPayment);
      expect(result.success).toBe(true);
    });

    it("fails when owner payment is missing accountId", () => {
      const result = rentPaymentSchema.safeParse({ ...validOwnerPayment, accountId: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(/select the paying bank\/wallet account/i);
      }
    });

    it("fails when friend payment is missing payerContactId", () => {
      const result = rentPaymentSchema.safeParse({ ...validFriendPayment, payerContactId: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(/select which roommate\/friend paid/i);
      }
    });

    it("fails when payment amount is non-positive", () => {
      const result = rentPaymentSchema.safeParse({ ...validOwnerPayment, amount: "0" });
      expect(result.success).toBe(false);
    });
  });

  describe("rentReserveSchemas", () => {
    it("validates createReserveSchema with positive amount and reason", () => {
      const result = createReserveSchema.safeParse({
        obligationId: "ro-2026-11",
        label: "Rent Safeguard Nov 2026",
        amount: "14000.00",
        reason: "Lock cash early before month-end shopping",
      });
      expect(result.success).toBe(true);
    });

    it("rejects createReserveSchema when amount is 0", () => {
      const result = createReserveSchema.safeParse({
        obligationId: "ro-2026-11",
        label: "Rent Safeguard",
        amount: "0",
        reason: "Test",
      });
      expect(result.success).toBe(false);
    });

    it("accepts adjustReserveSchema targetAmount 0 to release reserve", () => {
      const result = adjustReserveSchema.safeParse({
        targetAmount: "0",
        reason: "Releasing reserve because obligation is settled",
      });
      expect(result.success).toBe(true);
    });

    it("rejects adjustReserveSchema with negative target amount", () => {
      const result = adjustReserveSchema.safeParse({
        targetAmount: "-500",
        reason: "Invalid decrease",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("obligationActionSchema", () => {
    it("validates skip action with reason", () => {
      const result = obligationActionSchema.safeParse({
        action: "skip",
        reason: "Landlord waived October rent for property repairs",
      });
      expect(result.success).toBe(true);
    });

    it("validates reopen action with reason", () => {
      const result = obligationActionSchema.safeParse({
        action: "reopen",
        reason: "Incorrectly marked skipped; landlord requested settlement",
      });
      expect(result.success).toBe(true);
    });

    it("rejects action if reason is less than 3 characters", () => {
      const result = obligationActionSchema.safeParse({
        action: "skip",
        reason: "ok",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(/at least 3 characters/i);
      }
    });
  });
});
