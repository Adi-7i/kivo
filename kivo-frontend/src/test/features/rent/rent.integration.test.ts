import { describe, it, expect, vi } from "vitest";
import { forwardDjango } from "@/lib/server/api-bridge";
import { capacityEntity, obligationEntity, planEntity, type PlanDTO } from "@/features/rent/api";
import { invalidateFinance } from "@/features/finance/queries";
import { client } from "../finance/fixtures";
import { rentPlanSchema } from "@/features/rent/schemas/rent-plan.schema";

const id = "00000000-0000-4000-8000-000000000001";
describe("rent contract boundaries (isolated mocked HTTP; not database verification)", () => {
  it.each([
    ["plans/", "POST"],
    ["plans/" + id + "/", "PATCH"],
    ["plans/" + id + "/generate/", "POST"],
    ["obligations/" + id + "/payments/", "POST"],
    ["obligations/" + id + "/change-status/", "POST"],
    ["payments/" + id + "/correct/", "POST"],
    ["payments/" + id + "/reverse/", "POST"],
    ["reserves/", "POST"],
    ["reserves/" + id + "/adjust/", "POST"],
  ])("forwards only supported %s %s with the original audit identity", async (path, method) => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ id }));
    const response = await forwardDjango(
      new Request("http://localhost:3000/api/v1/rent/" + path, {
        method,
        headers: {
          Origin: "http://localhost:3000",
          "Content-Type": "application/json",
          "X-CSRFToken": "csrf",
          "Idempotency-Key": "original-intent",
        },
        body: JSON.stringify({ amount: "0.29" }),
      })
    );
    expect(response.status).toBe(200);
    const init = vi.mocked(fetch).mock.calls[0][1]!;
    expect((init.headers as Headers).get("Idempotency-Key")).toBe("original-intent");
    expect((init.headers as Headers).get("X-CSRFToken")).toBe("csrf");
    expect(init.body).toBe('{"amount":"0.29"}');
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
  it.each(["payments/", "obligations/", `reserves/${id}/`, `plans/${id}/obligations/`])(
    "rejects invented POST to %s",
    async (path) => {
      expect(
        (
          await forwardDjango(
            new Request("http://localhost:3000/api/v1/rent/" + path, { method: "POST" })
          )
        ).status
      ).toBe(405);
      expect(fetch).not.toHaveBeenCalled();
    }
  );
  it("allows only actual pagination, not invented server-side rent filters", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ results: [] }));
    expect(
      (
        await forwardDjango(
          new Request(`http://localhost:3000/api/v1/rent/obligations/${id}/payments/?page=2`)
        )
      ).status
    ).toBe(200);
    vi.mocked(fetch).mockClear();
    for (const query of ["month=2026-10", "page=1&page=2", "search=friend"])
      expect(
        (
          await forwardDjango(
            new Request("http://localhost:3000/api/v1/rent/obligations/?" + query)
          )
        ).status
      ).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("preserves distinct server capacity figures without independent subtraction", () => {
    expect(
      capacityEntity({ liquid_balance: "10.01", active_reserves: "9.99", safe_to_spend: "-0.29" })
    ).toEqual({ liquidBalancePaise: 1001, activeReservesPaise: 999, safeToSpendPaise: -29 });
  });
  it("keeps overdue independent from partial and keeps friend debt after landlord payment", () => {
    expect(
      obligationEntity({
        id,
        plan: id,
        month: "2026-02-01",
        due_date: "2026-02-28",
        amount: "2.00",
        paid: "1.00",
        outstanding: "1.00",
        friend_payable: "0.29",
        status: "partial",
        overdue: true,
        reason: null,
        created_at: "2026-02-01T00:00:00Z",
      })
    ).toMatchObject({
      status: "partial",
      overdue: true,
      friendPayablePaise: 29,
      outstandingPaise: 100,
    });
  });
  it("uses persisted owner shares and never invents a read-side split method", () => {
    const p: PlanDTO = {
      id,
      title: "Rent",
      payee: "Landlord",
      start_date: "2026-01-01",
      due_day: null,
      amount: "0.11",
      category: id,
      active: true,
      shares: [
        { contact: null, amount: "0.06" },
        { contact: id, amount: "0.05" },
      ],
      created_at: "2026-01-01T00:00:00Z",
    };
    expect(planEntity(p, [])).toMatchObject({ dueDay: null, userSharePaise: 6 });
    expect(planEntity(p, []).splitMethod).toBeUndefined();
    expect(() => planEntity({ ...p, shares: p.shares.slice(1) }, [])).toThrow(/confirm.*share/);
  });
  it("invalidates rent and capacity after existing claim settlement mutations", async () => {
    const qc = client(),
      spy = vi.spyOn(qc, "invalidateQueries");
    await invalidateFinance(qc);
    for (const key of [
      "rent-plans",
      "rent-obligations",
      "rent-payments",
      "rent-reserves",
      "spending-capacity",
      "dashboard",
      "accounts",
      "funds",
      "claims",
    ])
      expect(spy).toHaveBeenCalledWith({ queryKey: [key] });
  });
  it("validates custom user input exactly while leaving recognized shares to Django", () => {
    const body = {
      title: "Rent",
      payee: "Landlord",
      amount: "0.29",
      category: id,
      startDate: "2028-02-29",
      dueDayRule: "last_day",
      dueDay: null,
      isShared: true,
      splitMethod: "custom",
      roommateContactIds: [id],
      customShares: { user: "0.10", [id]: "0.19" },
    };
    expect(rentPlanSchema.safeParse(body).success).toBe(true);
    expect(
      rentPlanSchema.safeParse({ ...body, customShares: { user: "0.10", [id]: "0.18" } }).success
    ).toBe(false);
    expect(rentPlanSchema.safeParse({ ...body, startDate: "2027-02-29" }).success).toBe(false);
    expect(rentPlanSchema.safeParse({ ...body, dueDayRule: "fixed_day", dueDay: 32 }).success).toBe(
      false
    );
  });
});
