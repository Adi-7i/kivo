import { z } from "zod";

export const contactSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Contact name is required")
    .max(100, "Name cannot exceed 100 characters"),
  notes: z.string().trim().max(4000, "Notes cannot exceed 4000 characters").optional().default(""),
  isRoommate: z.boolean().default(false),
  archived: z.boolean().default(false),
});

export type ContactFormData = z.infer<typeof contactSchema>;
