import { describe, it, expect, vi } from "vitest";
import { dashboardMetrics } from "@/features/dashboard/api";
import { fundingState, fundingName } from "@/features/funding/api";
import { invalidateFinance } from "@/features/finance/queries";
import { client } from "./fixtures";
import { forwardDjango } from "@/lib/server/api-bridge";

describe("dashboard/funding representation (isolated, mocked HTTP only)", () => {
  it("maps independent server metrics without recomputing or mixing borrowing with income", () => {
    expect(
      dashboardMetrics({
        liquid_balance: "10.01",
        safe_to_spend: "-0.29",
        spending: { today: "0.01", week: "0.29", month: "1.01", year: "2.00" },
        selected_period: { external_income: "3.00" },
        receivables: "4.01",
        payables: "5.01",
        reserved: "10.30",
      })
    ).toEqual({
      liquidBalancePaise: 1001,
      safeToSpendPaise: -29,
      todayExpensePaise: 1,
      monthExpensePaise: 101,
      monthReceivedPaise: 300,
      moneyOwedToUserPaise: 401,
      moneyOwedByUserPaise: 501,
      reservedFundsPaise: 1030,
    });
  });
  it("does not infer exhaustion from zero liquid holdings or incomplete attribution", () => {
    expect(
      fundingState({
        attribution_status: "complete",
        remaining_capacity: "2.00",
        exhausted_on: null,
      })
    ).toBe("active");
    expect(
      fundingState({
        attribution_status: "incomplete",
        remaining_capacity: "0.00",
        exhausted_on: "2026-10-22",
      })
    ).toBe("incomplete");
    expect(
      fundingState({
        attribution_status: "complete",
        remaining_capacity: "0.00",
        exhausted_on: "2026-10-22",
      })
    ).toBe("exhausted");
    expect(
      fundingState({ attribution_status: "inactive", remaining_capacity: null, exhausted_on: null })
    ).toBe("inactive");
    expect(fundingName({ funding_source: "", source_type: "opening" })).toBe("Opening equity");
    expect(fundingName({ funding_source: "Friend", source_type: "borrow" })).toBe("Friend");
  });
  it("invalidates dashboard, report and snapshot consumers after financial corrections", async () => {
    const qc = client(),
      invalidate = vi.spyOn(qc, "invalidateQueries");
    await invalidateFinance(qc);
    for (const key of ["accounts", "transactions", "dashboard", "reports", "funds"])
      expect(invalidate).toHaveBeenCalledWith({ queryKey: [key] });
  });
  it.each([
    "dashboard/?period=month",
    "reports/trends/?period=last_seven_days&interval=day",
    "reports/breakdown/?period=month&dimension=category",
    "funds/summary/",
    "reports/funds/?page=1&run=00000000-0000-4000-8000-000000000001",
    "funds/batches/00000000-0000-4000-8000-000000000001/journey/?page=1&run=00000000-0000-4000-8000-000000000001",
  ])("forwards read-only owned reporting %s", async (path) => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({}));
    expect((await forwardDjango(new Request(`http://localhost:3000/api/v1/${path}`))).status).toBe(
      200
    );
    expect(
      (
        await forwardDjango(
          new Request(`http://localhost:3000/api/v1/${path.split("?")[0]}`, { method: "POST" })
        )
      ).status
    ).toBe(405);
  });
  it("rejects invented source filters and repeated snapshot selectors", async () => {
    for (const query of ["search=OtherUser", "run=a&run=b"]) {
      expect(
        (await forwardDjango(new Request(`http://localhost:3000/api/v1/funds/batches/?${query}`)))
          .status
      ).toBe(400);
    }
    expect(fetch).not.toHaveBeenCalled();
  });
});
