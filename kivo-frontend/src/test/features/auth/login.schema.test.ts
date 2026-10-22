import { describe, it, expect } from "vitest";
import { loginSchema } from "@/features/auth/schemas/login.schema";

describe("loginSchema", () => {
  it("passes validation with valid email and password", () => {
    const validData = {
      email: "user@example.com",
      password: "SecretPassword123",
    };
    const result = loginSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("fails when email is empty", () => {
    const invalidData = {
      email: "",
      password: "SecretPassword123",
    };
    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Email address is required");
    }
  });

  it("fails when email format is invalid", () => {
    const invalidData = {
      email: "not-an-email",
      password: "SecretPassword123",
    };
    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Please enter a valid email address");
    }
  });

  it("fails when password is empty", () => {
    const invalidData = {
      email: "user@example.com",
      password: "",
    };
    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Password is required");
    }
  });
});
