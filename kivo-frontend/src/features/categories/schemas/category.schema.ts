import { z } from "zod";

export const categorySchema = z.object({
  name: z
    .string()
    .min(2, "Category name must be at least 2 characters")
    .max(100, "Category name cannot exceed 100 characters")
    .transform((val) => val.trim()),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Invalid color hex format")
    .optional()
    .default("#3A5A40"),
  icon: z.string().max(50).optional().default("Tag"),
  isExpense: z.boolean().default(true),
});

export type CategoryFormData = z.infer<typeof categorySchema>;
