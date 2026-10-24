import { z } from "zod";
import { moneyInput, calendarDate } from "@/features/finance/validation";

export const expenseSchema = z.object({
  amount: moneyInput(),
  title: z
    .string()
    .trim()
    .min(2, "Title must be at least 2 characters")
    .max(200, "Title cannot exceed 200 characters"),
  categoryName: z.string().trim().min(1, "Please select or enter a category"),
  accountId: z.string().trim().min(1, "Please select the payment account"),
  effectiveDate: calendarDate,
  merchant: z.string().trim().max(200).optional(),
  paymentMethod: z.string().trim().max(50).optional(),
  notes: z.string().trim().max(4000).optional(),
});

export type ExpenseFormData = z.infer<typeof expenseSchema>;
