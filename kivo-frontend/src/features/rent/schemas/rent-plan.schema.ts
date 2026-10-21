import { z } from "zod";

export const rentPlanSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Plan title must be at least 2 characters")
    .max(200, "Title cannot exceed 200 characters"),
  payee: z
    .string()
    .trim()
    .min(2, "Landlord / Payee name is required")
    .max(200, "Payee name cannot exceed 200 characters"),
  startDate: z
    .string()
    .trim()
    .min(1, "Start date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  dueDayRule: z.enum(["fixed_day", "last_day"]).default("fixed_day"),
  dueDay: z.number().int().min(1).max(31).nullable().optional(),
  amount: z
    .string()
    .trim()
    .min(1, "Gross rent amount is required")
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount (e.g. 25000 or 30000.00)")
    .refine((val) => parseFloat(val) > 0, {
      message: "Rent amount must be greater than zero",
    }),
  isShared: z.boolean().default(false),
  splitMethod: z.enum(["equal", "custom"]).default("equal"),
  roommateContactIds: z.array(z.string()).optional().default([]),
  active: z.boolean().default(true),
});

export type RentPlanFormData = z.infer<typeof rentPlanSchema>;
