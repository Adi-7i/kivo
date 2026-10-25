import type { ApiDownload } from "@/types/api";
import { apiClient } from "@/lib/api/client";
import type { ReportParams } from "./filters";

/** Browser attachment names cannot retain paths, control characters or executable suffixes. */
export function exportFilename(disposition: string | null): string {
  let value = disposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (value) {
    try {
      value = decodeURIComponent(value);
    } catch {
      value = undefined;
    }
  }
  value ??=
    disposition?.match(/filename="([^"]*)"/i)?.[1] ?? disposition?.match(/filename=([^;]+)/i)?.[1];
  const name = (value ?? "")
    .split(/[\\/]/)
    .pop()
    ?.replace(/[\x00-\x1f\x7f]/g, "")
    .trim()
    .slice(0, 120);
  return name && !name.startsWith(".") && /\.csv$/i.test(name) ? name : "kivo-transactions.csv";
}
export async function fetchExport(
  params: ReportParams,
  signal?: AbortSignal
): Promise<ApiDownload> {
  return apiClient("/api/v1/reports/export/", { params, signal, responseType: "download" });
}
