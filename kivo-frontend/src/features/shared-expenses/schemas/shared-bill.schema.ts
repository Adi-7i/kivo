import { z } from "zod";
import { moneyInput, calendarDate } from "@/features/finance/validation";
import { normalizeOpeningBalance } from "@/features/onboarding/money";
export const participantShareInputSchema = z.object({
  contactId: z.uuid().nullable(),
  displayName: z.string(),
  amount: z.string().optional(),
  selected: z.boolean().default(true),
});
export const sharedBillSchema = z
  .object({
    title: z.string().trim().min(2, "Bill title must be at least 2 characters").max(200),
    amount: moneyInput(),
    category: z.uuid("Select an owned category"),
    effectiveDate: calendarDate,
    payerType: z.enum(["user", "friend"]),
    payerContactId: z.string().optional().default(""),
    accountId: z.string().optional().default(""),
    splitMethod: z.enum(["equal", "custom"]),
    merchant: z.string().max(200).optional().default(""),
    notes: z.string().max(4000).optional().default(""),
    selectedParticipants: z.array(z.uuid()).max(99),
    customShares: z.record(z.string(), z.string()).optional().default({}),
    reason: z.string().trim().max(500).optional().default(""),
  })
  .superRefine((data, context) => {
    if (new Set(data.selectedParticipants).size !== data.selectedParticipants.length)
      context.addIssue({
        code: "custom",
        path: ["selectedParticipants"],
        message: "Select each contact only once",
      });
    if (
      data.payerType === "friend" &&
      (!z.uuid().safeParse(data.payerContactId).success ||
        !data.selectedParticipants.includes(data.payerContactId))
    )
      context.addIssue({
        code: "custom",
        path: ["payerContactId"],
        message: "The payer must be an owned selected participant",
      });
    if (data.payerType === "user" && !z.uuid().safeParse(data.accountId).success)
      context.addIssue({
        code: "custom",
        path: ["accountId"],
        message: "Select an owned payment account",
      });
    if (data.splitMethod === "custom") {
      try {
        const expected = ["user", ...data.selectedParticipants];
        const total = expected.reduce(
          (sum, id) =>
            sum + BigInt(normalizeOpeningBalance(data.customShares[id] ?? "").replace(".", "")),
          BigInt(0)
        );
        if (total !== BigInt(normalizeOpeningBalance(data.amount).replace(".", "")))
          context.addIssue({
            code: "custom",
            path: ["customShares"],
            message: "Custom shares must sum exactly to the gross bill",
          });
      } catch {
        context.addIssue({
          code: "custom",
          path: ["customShares"],
          message: "Supply every custom share as a non-negative exact amount",
        });
      }
    }
  });
export type SharedBillFormData = z.infer<typeof sharedBillSchema>;
