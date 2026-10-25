import { describe, it, expect, vi } from "vitest";
import { clientTimeoutMs, upstreamTimeoutMs } from "@/lib/api/timeouts";
import { forwardDjango } from "@/lib/server/api-bridge";

describe("bounded remote operation deadlines (mocked transport)", () => {
  it.each([
    "accounts",
    "categories",
    "transactions",
    "contacts",
    "loans",
    "settlements",
    "shared-bills",
  ])("allows %s audit/validation responses without a write retry", (domain) => {
    const path = `/api/v1/${domain}/`;
    expect(upstreamTimeoutMs(path, "POST")).toBe(30_000);
    expect(clientTimeoutMs(path, "POST")).toBe(35_000);
    expect(upstreamTimeoutMs(path, "GET")).toBe(12_000);
    expect(clientTimeoutMs(path, "GET")).toBe(15_000);
  });
  it("keeps authentication and unauthorized future modules on the original budget", () => {
    expect(clientTimeoutMs("/api/v1/auth/login/", "POST")).toBe(15_000);
    expect(upstreamTimeoutMs("/api/v1/budgets/", "POST")).toBe(12_000);
  });
  it("preserves a real upstream 503 without retrying or manufacturing confirmation", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({ error: { type: "database_unavailable" } }, { status: 503 })
    );
    const response = await forwardDjango(
      new Request("http://localhost:3000/api/v1/loans/", {
        method: "POST",
        headers: {
          Origin: "http://localhost:3000",
          "Content-Type": "application/json",
          "Idempotency-Key": "unchanged",
        },
        body: "{}",
      })
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: { type: "database_unavailable" } });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
