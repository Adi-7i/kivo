"use client";
import { useOwnedQuery } from "@/features/finance/useOwnedQuery";
import type { SummaryDTO, TrendsDTO, BreakdownDTO, Interval, Dimension } from "./api";
import type { ReportParams } from "./filters";
export const useReportSummary = (params: ReportParams, enabled = true) =>
  useOwnedQuery<SummaryDTO>("reports", "/api/v1/reports/summary/", params, enabled);
export const useReportTrends = (params: ReportParams, interval: Interval, enabled = true) =>
  useOwnedQuery<TrendsDTO>("reports", "/api/v1/reports/trends/", { ...params, interval }, enabled);
export const useReportBreakdown = (params: ReportParams, dimension: Dimension, enabled = true) =>
  useOwnedQuery<BreakdownDTO>(
    "reports",
    "/api/v1/reports/breakdown/",
    { ...params, dimension },
    enabled
  );
