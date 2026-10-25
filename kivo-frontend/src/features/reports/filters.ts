import { z } from "zod";
import { calendarDate, moneyInput } from "@/features/finance/validation";
import { TRANSACTION_KIND_LABELS } from "@/features/transactions/types";
import { normalizeOpeningBalance } from "@/features/onboarding/money";

export const REPORT_PERIODS = [
  ["month", "This Month"],
  ["previous_month", "Previous Month"],
  ["week", "This Week"],
  ["last_seven_days", "Last 7 Days"],
  ["today", "Today"],
  ["yesterday", "Yesterday"],
  ["year", "This Year"],
  ["all", "All Time"],
] as const;
export const reportFilterSchema = z
  .object({
    period: z
      .enum([
        "today",
        "yesterday",
        "week",
        "last_seven_days",
        "month",
        "previous_month",
        "year",
        "all",
      ])
      .optional(),
    date: calendarDate.optional(),
    date_from: calendarDate.optional(),
    date_to: calendarDate.optional(),
    account: z.uuid().optional(),
    destination: z.uuid().optional(),
    category: z.uuid().optional(),
    contact: z.uuid().optional(),
    kind: z
      .enum(
        Object.keys(TRANSACTION_KIND_LABELS) as [
          keyof typeof TRANSACTION_KIND_LABELS,
          ...Array<keyof typeof TRANSACTION_KIND_LABELS>,
        ]
      )
      .optional(),
    merchant: z.string().trim().max(200).optional(),
    payment_method: z.string().trim().max(50).optional(),
    search: z.string().trim().max(200).optional(),
    amount_min: moneyInput(false).optional(),
    amount_max: moneyInput(false).optional(),
    sort: z.enum(["newest", "oldest", "highest", "lowest"]).optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.period && (v.date || v.date_from || v.date_to))
      ctx.addIssue({
        code: "custom",
        path: ["period"],
        message: "Choose a preset or explicit dates, not both.",
      });
    if (v.date && (v.date_from || v.date_to))
      ctx.addIssue({ code: "custom", path: ["date"], message: "Choose one day or a date range." });
    if (v.date_from && v.date_to && v.date_from > v.date_to)
      ctx.addIssue({
        code: "custom",
        path: ["date_to"],
        message: "End date must be on or after start.",
      });
    if (
      v.amount_min &&
      v.amount_max &&
      BigInt(normalizeOpeningBalance(v.amount_min).replace(".", "")) >
        BigInt(normalizeOpeningBalance(v.amount_max).replace(".", ""))
    )
      ctx.addIssue({
        code: "custom",
        path: ["amount_max"],
        message: "Maximum must be at least minimum.",
      });
  });
export type ReportParams = z.infer<typeof reportFilterSchema>;
export function cleanReportFilters(values: Record<string, string | undefined>): ReportParams {
  const allowed = new Set(Object.keys(reportFilterSchema.shape));
  if (Object.keys(values).some((key) => !allowed.has(key)))
    throw new Error("Unsupported report filter.");
  const params = reportFilterSchema.parse(
    Object.fromEntries(
      Object.entries(values)
        .filter(([, v]) => v?.trim())
        .map(([key, value]) => [key, value!.trim()])
    )
  );
  if (!params.period && !params.date && !params.date_from && !params.date_to)
    params.period = "month";
  return params;
}
export function readReportFilters(search: string): ReportParams {
  const query = new URLSearchParams(search);
  for (const key of query.keys())
    if (query.getAll(key).length !== 1) throw new Error("Repeated report filters are unsupported.");
  return cleanReportFilters(Object.fromEntries(query));
}
export function reportSearch(params: ReportParams): string {
  return new URLSearchParams(
    Object.entries(params).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string"
    )
  ).toString();
}
export function transactionHref(params: ReportParams, extra: ReportParams = {}): string {
  return "/transactions?" + reportSearch({ ...params, ...extra });
}
