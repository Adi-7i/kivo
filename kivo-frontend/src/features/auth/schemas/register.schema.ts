import { z } from "zod";

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters")
      .max(150, "Full name cannot exceed 150 characters"),
    email: z
      .string()
      .trim()
      .min(1, "Email address is required")
      .email("Please enter a valid email address")
      .max(255, "Email cannot exceed 255 characters"),
    password: z
      .string()
      .min(10, "Password must be at least 10 characters")
      .refine((value) => !/^\d+$/.test(value), "Password cannot be entirely numeric"),
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
      label: "At least 10 characters",
      met: password.length >= 10,
    },
    {
      id: "not-numeric",
      label: "Not entirely numeric",
      met: password.length > 0 && !/^\d+$/.test(password),
    },
  ];
}
