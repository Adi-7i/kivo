import { z } from "zod";
import { moneyInput, calendarDate } from "@/features/finance/validation";
export const loanSchema = z.object({
  kind: z.enum(["lend", "borrow"]),
  contactId: z.uuid("Please select a friend or contact"),
  accountId: z.uuid("Select an owned account"),
  amount: moneyInput(),
  effectiveDate: calendarDate,
  title: z.string().trim().min(2).max(200),
  notes: z.string().max(4000).optional().default(""),
  paymentMethod: z.string().max(50).optional().default("UPI"),
  reason: z.string().trim().max(500).optional().default(""),
});
export type LoanFormData = z.infer<typeof loanSchema>;
