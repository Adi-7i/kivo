import { z } from "zod";

export const csvExportSchema = z
  .object({
    startDate: z
      .string()
      .trim()
      .min(1, "Start date is required")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD"),
    endDate: z
      .string()
      .trim()
      .min(1, "End date is required")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be YYYY-MM-DD"),
    accountId: z.string().trim().optional().default("all"),
    category: z.string().trim().optional().default("all"),
    transactionType: z.string().trim().optional().default("all"),
    includeHeaders: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.startDate <= data.endDate;
      }
      return true;
    },
    {
      message: "Start date must not be after end date",
      path: ["endDate"],
    }
  );

export type CSVExportFormData = z.infer<typeof csvExportSchema>;
