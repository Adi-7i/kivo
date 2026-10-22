import { describe, it, expect } from "vitest";
import { transactionActionSchema } from "@/features/transactions/schemas/transaction-action.schema";

describe("transactionActionSchema", () => {
  it("validates valid reversal action", () => {
    const input = {
      actionType: "reversal",
      reason: "Accidental duplicate transaction posted",
    };
    const result = transactionActionSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.actionType).toBe("reversal");
      expect(result.data.reason).toBe("Accidental duplicate transaction posted");
    }
  });

  it("validates valid void action", () => {
    const input = {
      actionType: "void",
      reason: "User cancelled transaction before bank settlement",
    };
    const result = transactionActionSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.actionType).toBe("void");
    }
  });

  it("validates valid correction action with metadata", () => {
    const input = {
      actionType: "correction",
      reason: "Correcting merchant name and notes",
      title: "Grocery Shopping at Blinkit",
      merchant: "Blinkit",
      notes: "Quick milk and bread purchase",
    };
    const result = transactionActionSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.actionType).toBe("correction");
      if (result.data.actionType === "correction") {
        expect(result.data.title).toBe("Grocery Shopping at Blinkit");
        expect(result.data.merchant).toBe("Blinkit");
      }
    }
  });

  it("rejects reason shorter than 5 characters", () => {
    const input = {
      actionType: "reversal",
      reason: "Oops",
    };
    const result = transactionActionSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects reason exceeding 500 characters", () => {
    const input = {
      actionType: "reversal",
      reason: "A".repeat(501),
    };
    const result = transactionActionSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
