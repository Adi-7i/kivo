import { z } from "zod";

export const createReserveSchema = z.object({
  obligationId: z.string().trim().min(1, "Please select an obligation to protect"),
  label: z
    .string()
    .trim()
    .min(2, "Reserve label must be at least 2 characters")
    .max(100, "Label cannot exceed 100 characters"),
  amount: z
    .string()
    .trim()
    .min(1, "Reserve amount is required")
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount (e.g. 5000 or 10000.00)")
    .refine((val) => parseFloat(val) > 0, {
      message: "Reserve amount must be greater than zero",
    }),
  reason: z
    .string()
    .trim()
    .min(2, "Reason is required")
    .max(500, "Reason cannot exceed 500 characters"),
});

export const adjustReserveSchema = z.object({
  targetAmount: z
    .string()
    .trim()
    .min(1, "Target amount is required (enter 0 to release)")
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount (e.g. 0 or 8000.00)")
    .refine((val) => parseFloat(val) >= 0, {
      message: "Target amount cannot be negative",
    }),
  reason: z
    .string()
    .trim()
    .min(2, "Reason is required for adjusting or releasing reserves")
    .max(500, "Reason cannot exceed 500 characters"),
});

export type CreateReserveFormData = z.infer<typeof createReserveSchema>;
export type AdjustReserveFormData = z.infer<typeof adjustReserveSchema>;
