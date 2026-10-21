import { z } from "zod";

export const rentPaymentSchema = z
  .object({
    obligationId: z.string().trim().min(1, "Please select an obligation"),
    payerType: z.enum(["owner", "friend"]),
    accountId: z.string().optional().default(""),
    payerContactId: z.string().optional().default(""),
    amount: z
      .string()
      .trim()
      .min(1, "Payment amount is required")
      .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount (e.g. 10000 or 10000.00)")
      .refine((val) => parseFloat(val) > 0, {
        message: "Payment amount must be greater than zero",
      }),
    effectiveDate: z
      .string()
      .trim()
      .min(1, "Payment date is required")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
    title: z.string().trim().max(200).optional().default("Rent Payment"),
    notes: z.string().trim().max(4000).optional().default(""),
    paymentMethod: z.string().trim().max(50).optional().default("UPI"),
  })
  .refine(
    (data) => {
      if (data.payerType === "owner") {
        return Boolean(data.accountId && data.accountId.trim().length > 0);
      }
      return true;
    },
    {
      message: "Please select the paying bank/wallet account",
      path: ["accountId"],
    }
  )
  .refine(
    (data) => {
      if (data.payerType === "friend") {
        return Boolean(data.payerContactId && data.payerContactId.trim().length > 0);
      }
      return true;
    },
    {
      message: "Please select which roommate/friend paid the landlord",
      path: ["payerContactId"],
    }
  );

export type RentPaymentFormData = z.infer<typeof rentPaymentSchema>;
