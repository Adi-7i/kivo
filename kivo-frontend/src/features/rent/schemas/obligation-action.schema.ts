import { z } from "zod";

export const obligationActionSchema = z.object({
  action: z.enum(["skip", "reopen"]),
  reason: z
    .string()
    .trim()
    .min(3, "Please provide an auditable reason (at least 3 characters)")
    .max(500, "Reason cannot exceed 500 characters"),
});

export type ObligationActionFormData = z.infer<typeof obligationActionSchema>;
