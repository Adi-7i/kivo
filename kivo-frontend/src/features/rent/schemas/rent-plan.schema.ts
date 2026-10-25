import { z } from "zod";
import { calendarDate, moneyInput } from "@/features/finance/validation";
import { normalizeOpeningBalance } from "@/features/onboarding/money";
export const rentPlanSchema = z
  .object({
    title: z.string().trim().min(2).max(200),
    payee: z.string().trim().min(2, "Landlord / Payee name is required").max(200),
    startDate: calendarDate,
    dueDayRule: z.enum(["fixed_day", "last_day"]).default("fixed_day"),
    dueDay: z.number().int().min(1).max(31).nullable().optional(),
    amount: moneyInput(),
    category: z.uuid("Select an owned category"),
    isShared: z.boolean().default(false),
    splitMethod: z.enum(["equal", "custom"]).default("equal"),
    roommateContactIds: z.array(z.uuid()).max(99).optional().default([]),
    customShares: z.record(z.string(), z.string()).optional().default({}),
    active: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.dueDayRule === "fixed_day" && data.dueDay == null)
      ctx.addIssue({ code: "custom", path: ["dueDay"], message: "Choose a due day from 1 to 31" });
    if (new Set(data.roommateContactIds).size !== data.roommateContactIds.length)
      ctx.addIssue({
        code: "custom",
        path: ["roommateContactIds"],
        message: "Select each roommate once",
      });
    if (data.isShared && data.splitMethod === "custom") {
      try {
        const total = ["user", ...data.roommateContactIds].reduce(
          (sum, id) =>
            sum + BigInt(normalizeOpeningBalance(data.customShares[id] ?? "").replace(".", "")),
          BigInt(0)
        );
        if (total !== BigInt(normalizeOpeningBalance(data.amount).replace(".", "")))
          throw new Error();
      } catch {
        ctx.addIssue({
          code: "custom",
          path: ["customShares"],
          message: "Supply exact non-negative shares summing to gross rent",
        });
      }
    }
  });
export type RentPlanFormData = z.infer<typeof rentPlanSchema>;
