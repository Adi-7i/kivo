import { z } from "zod";
import { moneyInput, calendarDate } from "@/features/finance/validation";
export const settlementSchema = z.object({
  claimId: z.uuid("Please select an active claim to settle"),
  accountId: z.uuid("Select an owned account"),
  amount: moneyInput(),
  effectiveDate: calendarDate,
  title: z.string().trim().min(2).max(200),
  notes: z.string().max(4000).optional().default(""),
  paymentMethod: z.string().max(50).optional().default("UPI"),
  reason: z.string().trim().max(500).optional().default(""),
});
export type SettlementFormData = z.infer<typeof settlementSchema>;
