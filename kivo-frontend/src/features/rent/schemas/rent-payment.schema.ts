import { z } from "zod";
import { calendarDate, moneyInput } from "@/features/finance/validation";
export const rentPaymentSchema = z
  .object({
    obligationId: z.uuid("Please select an obligation"),
    payerType: z.enum(["owner", "friend"]),
    accountId: z.string().optional().default(""),
    payerContactId: z.string().optional().default(""),
    amount: moneyInput(),
    effectiveDate: calendarDate,
    title: z.string().trim().min(1).max(200).optional().default("Rent Payment"),
    notes: z.string().max(4000).optional().default(""),
    paymentMethod: z.string().max(50).optional().default("UPI"),
    reason: z.string().trim().max(500).optional().default(""),
  })
  .superRefine((data, ctx) => {
    const field = data.payerType === "owner" ? "accountId" : "payerContactId";
    if (!z.uuid().safeParse(data[field]).success)
      ctx.addIssue({
        code: "custom",
        path: [field],
        message:
          data.payerType === "owner"
            ? "Please select the paying bank/wallet account"
            : "Please select which roommate/friend paid the landlord",
      });
  });
export type RentPaymentFormData = z.infer<typeof rentPaymentSchema>;
