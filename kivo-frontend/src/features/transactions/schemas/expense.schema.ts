import { z } from "zod";

export const expenseSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, "Amount is required")
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount (e.g. 250 or 250.50)")
    .refine((val) => parseFloat(val) > 0, {
      message: "Expense amount must be greater than zero",
    }),
  title: z
    .string()
    .trim()
    .min(2, "Title must be at least 2 characters")
    .max(200, "Title cannot exceed 200 characters"),
  categoryName: z.string().trim().min(1, "Please select or enter a category"),
  accountId: z.string().trim().min(1, "Please select the payment account"),
  effectiveDate: z
    .string()
    .trim()
    .min(1, "Effective date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  merchant: z.string().trim().max(200).optional(),
  paymentMethod: z.string().trim().max(50).optional(),
  notes: z.string().trim().max(4000).optional(),
});

export type ExpenseFormData = z.infer<typeof expenseSchema>;
