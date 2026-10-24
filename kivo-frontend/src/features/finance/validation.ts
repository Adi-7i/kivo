import { z } from "zod";
import { normalizeOpeningBalance } from "@/features/onboarding/money";
import { ValidationError } from "@/lib/api/errors";

export const moneyInput = (positive = true) =>
  z
    .string()
    .trim()
    .min(1, "Amount is required")
    .refine((value) => {
      try {
        return !positive || normalizeOpeningBalance(value) !== "0.00";
      } catch {
        return false;
      }
    }, "Enter an amount within the supported limit, greater than zero, with at most two decimals")
    .refine((value) => {
      try {
        normalizeOpeningBalance(value);
        return true;
      } catch {
        return false;
      }
    }, "Enter a valid non-negative amount with at most two decimals");
export const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }, "Enter a valid calendar date");
export function financialError(error: unknown): string {
  if (error instanceof ValidationError)
    return (
      Object.entries(error.fieldErrors)
        .map(([field, messages]) => `${field}: ${messages.join(" ")}`)
        .join("; ") || error.message
    );
  return error instanceof Error ? error.message : "The request could not be confirmed.";
}
