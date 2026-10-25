import { z } from "zod";
import { moneyInput, calendarDate } from "@/features/finance/validation";
export const budgetSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100),
    type: z.enum(["overall", "category"]),
    category: z.string().default(""),
    amount: moneyInput(false),
    periodType: z.enum(["monthly", "custom"]),
    period: z.string(),
    start: z.string(),
    end: z.string(),
    warning: z.string().regex(/^(?:[1-9]|[1-9]\d|100)$/, "Use a whole percentage from 1 to 100"),
    archived: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "category" && !z.uuid().safeParse(data.category).success)
      ctx.addIssue({
        code: "custom",
        path: ["category"],
        message: "Select an owned expense category",
      });
    if (data.periodType === "monthly") {
      if (!/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(data.period))
        ctx.addIssue({ code: "custom", path: ["period"], message: "Use YYYY-MM" });
    } else {
      for (const key of ["start", "end"] as const)
        if (!calendarDate.safeParse(data[key]).success)
          ctx.addIssue({ code: "custom", path: [key], message: "Use a valid calendar date" });
      if (data.start > data.end)
        ctx.addIssue({ code: "custom", path: ["end"], message: "End must be on or after start" });
    }
  });
export type BudgetFormData = z.infer<typeof budgetSchema>;
