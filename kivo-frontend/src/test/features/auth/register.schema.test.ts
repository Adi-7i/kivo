import { describe, it, expect } from "vitest";
import {
  registerSchema,
  checkPasswordCriteria,
} from "@/features/auth/schemas/register.schema";

describe("registerSchema", () => {
  it("passes validation with matching valid data", () => {
    const validData = {
      fullName: "Adarsh Sharma",
      email: "adarsh@example.com",
      password: "StrongPassword1",
      confirmPassword: "StrongPassword1",
    };
    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("fails when full name is shorter than 2 characters", () => {
    const invalidData = {
      fullName: "A",
      email: "adarsh@example.com",
      password: "StrongPassword1",
      confirmPassword: "StrongPassword1",
    };
    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("at least 2 characters"))).toBe(true);
    }
  });

  it("fails when password lacks letters or numbers", () => {
    const noNumber = {
      fullName: "Adarsh Sharma",
      email: "adarsh@example.com",
      password: "onlylettershere",
      confirmPassword: "onlylettershere",
    };
    const resultNoNum = registerSchema.safeParse(noNumber);
    expect(resultNoNum.success).toBe(false);

    const noLetter = {
      fullName: "Adarsh Sharma",
      email: "adarsh@example.com",
      password: "1234567890",
      confirmPassword: "1234567890",
    };
    const resultNoLetter = registerSchema.safeParse(noLetter);
    expect(resultNoLetter.success).toBe(false);
  });

  it("fails when passwords do not match", () => {
    const mismatched = {
      fullName: "Adarsh Sharma",
      email: "adarsh@example.com",
      password: "StrongPassword1",
      confirmPassword: "DifferentPassword1",
    };
    const result = registerSchema.safeParse(mismatched);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message === "Passwords do not match")).toBe(true);
    }
  });
});

describe("checkPasswordCriteria", () => {
  it("reports unmet criteria for empty password", () => {
    const criteria = checkPasswordCriteria("");
    expect(criteria.every((c) => !c.met)).toBe(true);
  });

  it("reports met criteria correctly for strong password", () => {
    const criteria = checkPasswordCriteria("SecurePass123");
    expect(criteria.every((c) => c.met)).toBe(true);
  });

  it("accurately detects partial criteria", () => {
    const criteria = checkPasswordCriteria("short1");
    const len = criteria.find((c) => c.id === "min-length");
    const num = criteria.find((c) => c.id === "has-number");
    const lettr = criteria.find((c) => c.id === "has-letter");

    expect(len?.met).toBe(false);
    expect(num?.met).toBe(true);
    expect(lettr?.met).toBe(true);
  });
});
