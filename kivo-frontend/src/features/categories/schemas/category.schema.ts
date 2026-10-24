import { z } from "zod";

export const categorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Category name must be at least 2 characters")
      .max(100, "Category name cannot exceed 100 characters")
      .transform((val) => val.trim()),
    parent: z.union([z.literal(""), z.uuid()]).default(""),
    archived: z.boolean().default(false),
  })
  .strict();

export type CategoryFormData = z.infer<typeof categorySchema>;
