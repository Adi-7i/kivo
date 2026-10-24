import { z } from "zod";
import { normalizeOpeningBalance } from "../money";

export const accountSchema = z.object({
  accountName: z
    .string()
    .trim()
    .min(2, "Account name must be at least 2 characters")
    .max(100, "Account name cannot exceed 100 characters"),
  accountType: z.enum(["bank", "cash", "wallet"], {
    message: "Please select an account type",
  }),
  openingBalance: z
    .string()
    .trim()
    .min(1, "Opening balance is required")
    .regex(/^\d+(\.\d{1,2})?$/, "Please enter a valid non-negative amount (e.g. 5000 or 5000.50)")
    .refine(
      (val) => {
        try {
          normalizeOpeningBalance(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Opening balance exceeds the supported limit" }
    ),
  openingDate: z
    .string()
    .trim()
    .min(1, "Opening date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Opening date must be in YYYY-MM-DD format")
    .refine((value) => {
      const date = new Date(`${value}T00:00:00Z`);
      return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
    }, "Enter a valid calendar date"),
});

export type AccountFormData = z.infer<typeof accountSchema>;
