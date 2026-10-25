import { z } from "zod";
import { calendarDate } from "@/features/finance/validation";
import { TRANSACTION_KIND_LABELS } from "@/features/transactions/types";
const optionalId = z.union([z.literal(""), z.uuid()]);
export const csvExportSchema = z
  .object({
    startDate: calendarDate,
    endDate: calendarDate,
    accountId: optionalId.default(""),
    category: optionalId.default(""),
    transactionType: z
      .union([
        z.literal(""),
        z.enum(
          Object.keys(TRANSACTION_KIND_LABELS) as [
            keyof typeof TRANSACTION_KIND_LABELS,
            ...Array<keyof typeof TRANSACTION_KIND_LABELS>,
          ]
        ),
      ])
      .default(""),
  })
  .refine((v) => v.startDate <= v.endDate, {
    path: ["endDate"],
    message: "Start date must not be after end date",
  });
export type CSVExportFormData = z.infer<typeof csvExportSchema>;
