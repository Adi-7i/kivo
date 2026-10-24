import { z } from "zod";
import { moneyInput, calendarDate } from "@/features/finance/validation";

export const receiptSchema = z.object({
  amount: moneyInput(),
  fundingSource: z.string().trim().min(1, "External funding source is required").max(200),
  title: z
    .string()
    .trim()
    .min(2, "Source or description must be at least 2 characters")
    .max(200, "Source cannot exceed 200 characters"),
  accountId: z.string().trim().min(1, "Please select the receiving account"),
  effectiveDate: calendarDate,
  notes: z.string().trim().max(4000).optional(),
});

export type ReceiptFormData = z.infer<typeof receiptSchema>;
