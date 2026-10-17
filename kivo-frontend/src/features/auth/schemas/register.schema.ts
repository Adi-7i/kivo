import { z } from "zod";

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters")
      .max(100, "Full name cannot exceed 100 characters"),
    email: z
      .string()
      .trim()
      .min(1, "Email address is required")
      .email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[a-zA-Z]/, "Password must contain at least one letter"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

export interface PasswordCriterion {
  id: string;
  label: string;
  met: boolean;
}

export function checkPasswordCriteria(password: string): PasswordCriterion[] {
  return [
    {
      id: "min-length",
      label: "At least 8 characters",
      met: password.length >= 8,
    },
    {
      id: "has-letter",
      label: "Contains at least one letter",
      met: /[a-zA-Z]/.test(password),
    },
    {
      id: "has-number",
      label: "Contains at least one number",
      met: /[0-9]/.test(password),
    },
  ];
}
