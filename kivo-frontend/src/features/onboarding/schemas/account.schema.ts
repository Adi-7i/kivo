import { z } from "zod";

export const accountSchema = z.object({
  accountName: z
    .string()
    .trim()
    .min(2, "Account name must be at least 2 characters")
    .max(50, "Account name cannot exceed 50 characters"),
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
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0 && num <= 100000000;
      },
      { message: "Amount must be a realistic non-negative balance" }
    ),
  openingDate: z
    .string()
    .trim()
    .min(1, "Opening date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Opening date must be in YYYY-MM-DD format"),
});

export type AccountFormData = z.infer<typeof accountSchema>;
