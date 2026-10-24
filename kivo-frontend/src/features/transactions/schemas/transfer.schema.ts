import { z } from "zod";
import { moneyInput, calendarDate } from "@/features/finance/validation";

export const transferSchema = z
  .object({
    amount: moneyInput(),
    fromAccountId: z.string().trim().min(1, "Please select the source account"),
    toAccountId: z.string().trim().min(1, "Please select the destination account"),
    effectiveDate: calendarDate,
    notes: z.string().trim().max(4000).optional(),
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    message: "Source and destination accounts must be different",
    path: ["toAccountId"],
  });

export type TransferFormData = z.infer<typeof transferSchema>;
