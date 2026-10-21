import { z } from "zod";

export const budgetSchema = z
  .object({
    type: z.enum(["overall", "category"]),
    amount: z
      .string()
      .trim()
      .min(1, "Budget amount is required")
      .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount (e.g. 15000 or 15000.50)")
      .refine((val) => parseFloat(val) > 0, {
        message: "Budget limit must be greater than zero",
      }),
    category: z.string().trim().optional().default(""),
    period: z
      .string()
      .trim()
      .min(1, "Budget period is required")
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Period must be YYYY-MM (e.g. 2026-10)"),
    notes: z.string().trim().max(500, "Notes cannot exceed 500 characters").optional().default(""),
  })
  .refine(
    (data) => {
      if (data.type === "category") {
        return Boolean(data.category && data.category.length > 0);
      }
      return true;
    },
    {
      message: "Please select an expense category for category budget",
      path: ["category"],
    }
  );

export type BudgetFormData = z.infer<typeof budgetSchema>;
