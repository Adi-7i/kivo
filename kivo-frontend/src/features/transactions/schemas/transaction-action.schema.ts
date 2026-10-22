import { z } from "zod";

export const transactionActionSchema = z.discriminatedUnion("actionType", [
  z.object({
    actionType: z.literal("reversal"),
    reason: z
      .string()
      .min(5, "Reversal reason must be at least 5 characters")
      .max(500, "Reversal reason cannot exceed 500 characters")
      .transform((v) => v.trim()),
  }),
  z.object({
    actionType: z.literal("void"),
    reason: z
      .string()
      .min(5, "Void reason must be at least 5 characters")
      .max(500, "Void reason cannot exceed 500 characters")
      .transform((v) => v.trim()),
  }),
  z.object({
    actionType: z.literal("correction"),
    reason: z
      .string()
      .min(5, "Correction explanation must be at least 5 characters")
      .max(500, "Correction explanation cannot exceed 500 characters")
      .transform((v) => v.trim()),
    title: z.string().min(2, "Title must be at least 2 characters").max(200).optional(),
    merchant: z.string().max(200).optional(),
    notes: z.string().max(4000).optional(),
  }),
]);

export type TransactionActionFormData = z.infer<typeof transactionActionSchema>;
