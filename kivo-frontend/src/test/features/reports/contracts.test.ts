import { describe, it, expect, vi } from "vitest";
import { apiClient } from "@/lib/api/client";
import { forwardDjango } from "@/lib/server/api-bridge";
import { exportFilename } from "@/features/reports/download";
import { readReportFilters, reportSearch, transactionHref } from "@/features/reports/filters";
import { historyFiltersFromSearch, historyParams } from "@/features/transactions/history";
import type { TransactionFilterState } from "@/features/transactions/types";
const id = "00000000-0000-4000-8000-000000000001";
describe("report contract and download transport (isolated mocked HTTP)", () => {
  it.each([
    "today",
    "yesterday",
    "week",
    "last_seven_days",
    "month",
    "previous_month",
    "year",
    "all",
  ])("preserves exact backend preset %s", (period) =>
    expect(readReportFilters("period=" + period)).toEqual({ period })
  );
  it.each([
    "period=month&date=2026-10-01",
    "period=week&period=month",
    "date_from=2026-11-01&date_to=2026-10-01",
    "date=2027-02-29",
    "account=fake",
    "owner=2",
    "kind=income",
    "amount_min=1&amount_max=0.99",
  ])("rejects unsafe/ambiguous selection %s", (value) =>
    expect(() => readReportFilters(value)).toThrow()
  );
  it("keeps contact, merchant, category, dates and payment filters identical in drill-down history", () => {
    const params = readReportFilters(
      "date_from=2026-09-01&date_to=2026-09-30&account=" +
        id +
        "&category=" +
        id +
        "&contact=" +
        id +
        "&kind=expense&merchant=Caf%C3%A9&payment_method=UPI&amount_min=0.01"
    );
    const url = transactionHref(params);
    expect(url).toBe("/transactions?" + reportSearch(params));
    const initial = historyFiltersFromSearch(url.split("?")[1]);
    const result = historyParams({ ...initial, sortBy: "date_desc" } as TransactionFilterState, 1);
    for (const [key, value] of Object.entries(params)) expect(result[key]).toBe(value);
    expect(result.period).toBeUndefined();
  });
  it.each([
    ['attachment; filename="ledger.csv"', "ledger.csv"],
    ["attachment; filename*=UTF-8''Caf%C3%A9.csv", "Café.csv"],
    ['attachment; filename="../../ledger.csv"', "ledger.csv"],
    ['attachment; filename="bad.exe"', "kivo-transactions.csv"],
    ['attachment; filename=".csv"', "kivo-transactions.csv"],
    [null, "kivo-transactions.csv"],
  ])("sanitizes attachment name %s", (header, expected) =>
    expect(exportFilename(header)).toBe(expected)
  );
  it("forwards exact CSV bytes and approved export metadata with private headers", async () => {
    const csv = "\ufeffeffective_date,title\r\n2026-10-25,'=SUM(1)\r\n";
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="ledger.csv"',
          "X-Kivo-Export-Timezone": "Asia/Kolkata",
          "X-Kivo-Export-Filters": '{"kind":"expense"}',
        },
      })
    );
    const result = await forwardDjango(
      new Request("http://localhost:3000/api/v1/reports/export/?kind=expense&account=" + id, {
        headers: { Cookie: "sessionid=opaque;csrftoken=token;unrelated=private" },
      })
    );
    expect(result.status).toBe(200);
    expect(await result.arrayBuffer()).toEqual(new TextEncoder().encode(csv).buffer);
    expect(result.headers.get("content-disposition")).toContain("ledger.csv");
    expect(result.headers.get("cache-control")).toContain("no-store");
    expect(result.headers.get("x-content-type-options")).toBe("nosniff");
    expect(result.headers.get("x-kivo-export-timezone")).toBe("Asia/Kolkata");
    const init = vi.mocked(fetch).mock.calls[0][1]!;
    expect(new Headers(init.headers).get("Cookie")).toBe("sessionid=opaque; csrftoken=token");
    expect(new Headers(init.headers).get("Accept")).toBe("application/json");
  });
  it("returns an authenticated CSV blob through the established client", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("head\r\nrow\r\n", {
        headers: {
          "content-type": "text/csv",
          "content-disposition": 'attachment; filename="test.csv"',
        },
      })
    );
    const file = await apiClient("/api/v1/reports/export/", {
      responseType: "download",
      params: { period: "month" },
    });
    expect(await file.blob.text()).toBe("head\r\nrow\r\n");
    expect(vi.mocked(fetch).mock.calls[0][1]).toMatchObject({
      credentials: "same-origin",
      cache: "no-store",
    });
  });
  it.each([400, 401, 403, 429, 500, 503])(
    "does not create download success for HTTP %s",
    async (status) => {
      vi.mocked(fetch).mockResolvedValueOnce(Response.json({ detail: "Rejected" }, { status }));
      await expect(
        apiClient("/api/v1/reports/export/", { responseType: "download" })
      ).rejects.toMatchObject({ status });
      expect(fetch).toHaveBeenCalledTimes(1);
    }
  );
  it("rejects HTML/JSON success responses instead of downloading them as CSV", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ success: true }));
    await expect(
      apiClient("/api/v1/reports/export/", { responseType: "download" })
    ).rejects.toMatchObject({ status: 502 });
  });
  it.each([204, 206])("rejects an incomplete CSV success status %s", async (status) => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(status === 204 ? null : "partial", {
        status,
        headers: { "content-type": "text/csv" },
      })
    );
    await expect(
      apiClient("/api/v1/reports/export/", { responseType: "download" })
    ).rejects.toMatchObject({ status: 502 });
  });
  it("rejects a truncated stream before offering a blob", async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("partial"));
        controller.error(new TypeError("fetch stream lost"));
      },
    });
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(body, { headers: { "content-type": "text/csv" } })
    );
    await expect(
      apiClient("/api/v1/reports/export/", { responseType: "download" })
    ).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("keeps genuine Django JSON rejection on the export path", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({ detail: "Not authenticated" }, { status: 401 })
    );
    const result = await forwardDjango(new Request("http://localhost:3000/api/v1/reports/export/"));
    expect(result.status).toBe(401);
    expect(await result.json()).toEqual({ detail: "Not authenticated" });
  });
  it("rejects fabricated budget/delete/export methods and repeated report filters before upstream", async () => {
    for (const request of [
      new Request("http://localhost:3000/api/v1/budgets/" + id + "/", { method: "DELETE" }),
      new Request("http://localhost:3000/api/v1/reports/export/", { method: "POST" }),
      new Request("http://localhost:3000/api/v1/reports/summary/?period=month&period=year"),
      new Request("http://localhost:3000/api/v1/budgets/?category=" + id),
    ])
      expect((await forwardDjango(request)).status).toBeGreaterThanOrEqual(400);
    expect(fetch).not.toHaveBeenCalled();
  });
});
