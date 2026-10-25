import type { components } from "@/types/django.generated";
export type SummaryDTO = components["schemas"]["ReportSummary"];
export type TrendsDTO = components["schemas"]["Trends"];
export type BreakdownDTO = components["schemas"]["ReportBreakdown"];
export type BreakdownRow = components["schemas"]["BreakdownRow"];
export type ReportFundDTO = components["schemas"]["ReportFundingBatch"];
export type Interval = "day" | "week" | "month";
export type Dimension = "category" | "account" | "merchant" | "payment_method" | "contact" | "kind";
