import { z } from "zod";

export const loanSchema = z.object({
  kind: z.enum(["lend", "borrow"]),
  contactId: z.string().trim().min(1, "Please select a friend or contact"),
  accountId: z.string().trim().min(1, "Please select an account"),
  amount: z
    .string()
    .trim()
    .min(1, "Amount is required")
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount (e.g. 1000 or 1500.50)")
    .refine((val) => parseFloat(val) > 0, {
      message: "Amount must be greater than zero",
    }),
  effectiveDate: z
    .string()
    .trim()
    .min(1, "Date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  title: z
    .string()
    .trim()
    .min(2, "Title must be at least 2 characters")
    .max(200, "Title cannot exceed 200 characters"),
  notes: z.string().trim().max(4000).optional().default(""),
  paymentMethod: z.string().trim().max(50).optional().default("UPI"),
});

export type LoanFormData = z.infer<typeof loanSchema>;
