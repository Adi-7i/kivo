import { z } from "zod";

export const participantShareInputSchema = z.object({
  contactId: z.string().nullable(),
  displayName: z.string(),
  amount: z.string().optional(),
  selected: z.boolean().default(true),
});

export const sharedBillSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "Bill title must be at least 2 characters")
      .max(200, "Title cannot exceed 200 characters"),
    amount: z
      .string()
      .trim()
      .min(1, "Total bill amount is required")
      .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount (e.g. 1500 or 1500.50)")
      .refine((val) => parseFloat(val) > 0, {
        message: "Total amount must be greater than zero",
      }),
    category: z.string().trim().min(1, "Category is required"),
    effectiveDate: z
      .string()
      .trim()
      .min(1, "Effective date is required")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
    payerType: z.enum(["user", "friend"]),
    payerContactId: z.string().optional().default(""),
    accountId: z.string().optional().default(""),
    splitMethod: z.enum(["equal", "custom"]),
    merchant: z.string().trim().max(200).optional().default(""),
    notes: z.string().trim().max(4000).optional().default(""),
    selectedParticipants: z
      .array(z.string())
      .min(1, "Please select at least one friend to split with"),
    customShares: z.record(z.string(), z.string()).optional().default({}),
  })
  .refine(
    (data) => {
      if (data.payerType === "friend") {
        return Boolean(data.payerContactId && data.payerContactId.trim().length > 0);
      }
      return true;
    },
    {
      message: "Please select which friend paid for this bill",
      path: ["payerContactId"],
    }
  )
  .refine(
    (data) => {
      if (data.payerType === "user") {
        return Boolean(data.accountId && data.accountId.trim().length > 0);
      }
      return true;
    },
    {
      message: "Please select the account used to pay this bill",
      path: ["accountId"],
    }
  );

export type SharedBillFormData = z.infer<typeof sharedBillSchema>;
