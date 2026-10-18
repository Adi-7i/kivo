import { z } from "zod";

export const transferSchema = z
  .object({
    amount: z
      .string()
      .trim()
      .min(1, "Amount is required")
      .regex(
        /^\d+(\.\d{1,2})?$/,
        "Enter a valid amount (e.g. 2000 or 2000.50)"
      )
      .refine((val) => parseFloat(val) > 0, {
        message: "Transfer amount must be greater than zero",
      }),
    fromAccountId: z
      .string()
      .trim()
      .min(1, "Please select the source account"),
    toAccountId: z
      .string()
      .trim()
      .min(1, "Please select the destination account"),
    effectiveDate: z
      .string()
      .trim()
      .min(1, "Effective date is required")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
    notes: z.string().trim().max(4000).optional(),
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    message: "Source and destination accounts must be different",
    path: ["toAccountId"],
  });

export type TransferFormData = z.infer<typeof transferSchema>;
