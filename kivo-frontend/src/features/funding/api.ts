import type { components } from "@/types/django.generated";
export type FundSummaryDTO = components["schemas"]["FundSummary"];
export type FundingBatchDTO = components["schemas"]["FundingBatch"];
export type ReportBatchDTO = components["schemas"]["ReportFundingBatch"];
export type AllocationDTO = components["schemas"]["Allocation"];
export type FundBreakdownDTO = components["schemas"]["Breakdown"];

/** Status presentation only. Never infer exhaustion from an account's cash balance. */
export function fundingState(
  batch: Pick<FundingBatchDTO, "attribution_status" | "exhausted_on" | "remaining_capacity">
): string {
  if (batch.attribution_status !== "complete") return batch.attribution_status;
  return batch.exhausted_on && batch.remaining_capacity === "0.00" ? "exhausted" : "active";
}
export function fundingName(
  batch: Pick<FundingBatchDTO, "funding_source" | "source_type">
): string {
  return (
    batch.funding_source || (batch.source_type === "opening" ? "Opening equity" : batch.source_type)
  );
}
