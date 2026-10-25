import type { components } from "@/types/django.generated";
export type BudgetDTO = components["schemas"]["Budget"];
export type BudgetInput = components["schemas"]["BudgetWriteRequest"];
export type BudgetPatch = components["schemas"]["PatchedBudgetWriteRequest"];

/** Calendar input bounds only; consumption and progress always come from Django. */
export function monthBounds(month: string): { start: string; end: string } {
  if (!/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Use a valid YYYY-MM month.");
  const start = month + "-01";
  const date = new Date(start + "T00:00:00Z");
  date.setUTCMonth(date.getUTCMonth() + 1, 0);
  return { start, end: date.toISOString().slice(0, 10) };
}
