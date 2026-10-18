import { z } from "zod";

export const receiptSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, "Amount is required")
    .regex(
      /^\d+(\.\d{1,2})?$/,
      "Enter a valid amount (e.g. 15000 or 15000.50)"
    )
    .refine((val) => parseFloat(val) > 0, {
      message: "Received amount must be greater than zero",
    }),
  title: z
    .string()
    .trim()
    .min(2, "Source or description must be at least 2 characters")
    .max(200, "Source cannot exceed 200 characters"),
  accountId: z
    .string()
    .trim()
    .min(1, "Please select the receiving account"),
  effectiveDate: z
    .string()
    .trim()
    .min(1, "Effective date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  notes: z.string().trim().max(4000).optional(),
});

export type ReceiptFormData = z.infer<typeof receiptSchema>;
