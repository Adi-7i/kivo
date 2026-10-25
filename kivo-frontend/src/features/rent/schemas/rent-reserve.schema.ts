import { z } from "zod";
import { moneyInput } from "@/features/finance/validation";
const reason = z.string().trim().min(2, "Reason is required").max(500);
export const createReserveSchema = z.object({
  obligationId: z.uuid("Please select an obligation to protect"),
  label: z.string().trim().min(2).max(100),
  amount: moneyInput(),
  reason,
});
export const adjustReserveSchema = z.object({ targetAmount: moneyInput(false), reason });
export type CreateReserveFormData = z.infer<typeof createReserveSchema>;
export type AdjustReserveFormData = z.infer<typeof adjustReserveSchema>;
