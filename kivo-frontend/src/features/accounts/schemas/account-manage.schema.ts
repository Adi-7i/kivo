import { z } from "zod";
import { moneyInput, calendarDate } from "@/features/finance/validation";

export const accountManageSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Account name must be at least 2 characters")
    .max(100, "Account name cannot exceed 100 characters"),
  kind: z.enum(["bank", "cash", "wallet"], {
    message: "Please select a valid account type",
  }),
  openingBalance: moneyInput(false),
  openedOn: calendarDate,
  archived: z.boolean().optional(),
});

export type AccountManageFormData = z.infer<typeof accountManageSchema>;
