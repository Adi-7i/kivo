import { test, expect, request } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { rentHarness } from "./rent-live";
import { backendOrigin, frontendOrigin, posted, authPost } from "./live-api";
import type { ObligationDTO, PaymentDTO, ReserveHistoryDTO } from "../src/features/rent/api";

test.use({ storageState: { cookies: [], origins: [] } });
test.setTimeout(1_200_000);

test("approved friend-paid rent reserve journey: 3000 / 2000 / 1000 through partial and full repayment", async ({
  page,
  context,
}) => {
  const f = await rentHarness(page, context, "3000.00");
  const plan = await f.createPlan("2000.00");
  const generated = await f.generate(plan);
  expect(generated.count).toBe(1);
  const o = generated.results[0];
  await f.capacity("3000.00", "0.00", "3000.00", "0.00");
  const reserve = await f.reserve(o, "2000.00");
  await f.capacity("3000.00", "2000.00", "1000.00", "0.00");
  const payment = await f.pay(o, "2000.00", true);
  expect(payment.event).toMatchObject({ kind: "shared_due", account: null });
  expect(payment.event.claims).toHaveLength(1);
  await f.capacity("3000.00", "2000.00", "1000.00", "2000.00", "2000.00");
  expect(await f.get<ObligationDTO>(`rent/obligations/${o.id}/`)).toMatchObject({
    paid: "2000.00",
    outstanding: "0.00",
    friend_payable: "2000.00",
    status: "paid",
  });
  const blocked = await f.api.post(`${backendOrigin}/api/v1/rent/reserves/${reserve.id}/adjust/`, {
    headers: await f.headers(),
    data: { amount: "0.00", reason: "Test protected claim reserve cannot be released" },
    timeout: 60_000,
  });
  expect(blocked.status()).toBe(409);
  await f.repay(o, payment.event.claims[0], "800.00");
  await f.capacity("2200.00", "1200.00", "1000.00", "2000.00", "1200.00");
  await f.repay(o, payment.event.claims[0], "1200.00");
  await f.capacity("1000.00", "0.00", "1000.00", "2000.00");
  const history = await f.get<{ results: ReserveHistoryDTO[] }>(
    `rent/reserves/${reserve.id}/history/`
  );
  expect(history.results).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ delta: "-800.00", active: true }),
      expect.objectContaining({ delta: "-1200.00", active: true }),
    ])
  );
  expect(await f.get(`claims/${payment.event.claims[0]}/`)).toMatchObject({
    outstanding: "0.00",
    status: "settled",
  });
  const sources = await f.get<{ results: { remaining_capacity: string }[] }>("funds/batches/");
  expect(sources.results).toEqual(
    expect.arrayContaining([expect.objectContaining({ remaining_capacity: "1000.00" })])
  );
  await page.reload();
  await f.capacity("1000.00", "0.00", "1000.00", "2000.00");
  await page.goto("/dashboard");
  for (const [title, value] of [
    ["Total Liquid Balance", "₹1,000.00"],
    ["Safe-to-Spend", "₹1,000.00"],
    ["Monthly Expenses", "₹2,000.00"],
    ["Money Received", "₹0.00"],
  ])
    await expect(
      page.locator('[data-slot="card"]').filter({ has: page.getByText(title, { exact: true }) })
    ).toContainText(value);
  await page.goto("/money");
  await expect(
    page
      .locator('[data-slot="card"]')
      .filter({ has: page.getByRole("heading", { name: f.account.name, exact: true }) })
  ).toContainText("₹1,000.00");
  await page.goto("/money/sources");
  await expect(
    page
      .locator('[data-slot="card"]')
      .filter({ has: page.getByText("Remaining capacity (not cash)", { exact: true }) })
  ).toContainText("₹1,000.00");
  await expect(
    page
      .getByRole("row")
      .filter({ has: page.getByRole("link", { name: "View Journey →", exact: true }) })
      .getByRole("cell")
      .nth(5)
  ).toHaveText("₹1,000.00");
  f.assertHealthy();
});

test("shared owner-paid partial/full rent and ambiguous commit reconcile the original key after refresh", async ({
  page,
  context,
}) => {
  const f = await rentHarness(page, context);
  const plan = await f.createPlan("0.11", { shared: true });
  expect(plan.shares).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ contact: null, amount: "0.06" }),
      expect.objectContaining({ contact: f.contact.id, amount: "0.05" }),
    ])
  );
  const o = (await f.generate(plan)).results[0];
  await f.reserve(o, "0.11");
  const first = await f.pay(o, "0.05");
  await f.capacity("9.95", "0.06", "9.89", "0.03", "0.00", "0.02");
  const path = `/api/v1/rent/obligations/${o.id}/payments/`;
  let original!: { key: string; body: object; payment: PaymentDTO };
  let intercepted = 0;
  await page.route(`**${path}`, async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    intercepted++;
    const response = await route.fetch({ timeout: 60_000 });
    expect(response.status()).toBe(201);
    original = {
      key: (await route.request().allHeaders())["idempotency-key"],
      body: route.request().postDataJSON(),
      payment: await response.json(),
    };
    await route.abort("failed");
  });
  await f.openPay(o, "0.06");
  await f.dialog().getByRole("button", { name: "Record Payment", exact: true }).dblclick();
  await expect(page.getByRole("button", { name: "Check server status", exact: true })).toBeVisible({
    timeout: 60_000,
  });
  expect(intercepted).toBe(1);
  await page.unroute(`**${path}`);
  await page.reload();
  await f.details(o);
  await page.getByRole("button", { name: "Resolve pending rent payment", exact: true }).click();
  await page.getByRole("button", { name: "Check server status", exact: true }).click();
  const response = page.waitForResponse((r) => posted(r, path), { timeout: 60_000 });
  await page.getByRole("button", { name: "Retry original request", exact: true }).click();
  const replay = await response;
  expect(replay.status()).toBe(200);
  expect((await replay.json()).id).toBe(original.payment.id);
  expect((await replay.request().allHeaders())["idempotency-key"]).toBe(original.key);
  expect(replay.request().postDataJSON()).toEqual(original.body);
  await expect(
    page.getByRole("button", { name: "Retry original request", exact: true })
  ).not.toBeVisible();
  await f.closeDetails();
  await f.capacity("9.89", "0.00", "9.89", "0.06", "0.00", "0.05");
  const conflict = await f.api.post(backendOrigin + path, {
    headers: await f.headers(original.key),
    data: { ...original.body, amount: "0.01" },
    timeout: 60_000,
  });
  expect(conflict.status()).toBe(409);
  const payments = await f.get<{ count: number }>(`rent/obligations/${o.id}/payments/`);
  expect(payments.count).toBe(2);
  await f.repay(o, first.event.claims[0], "0.01");
  await f.capacity("9.90", "0.00", "9.90", "0.06", "0.00", "0.04");
  await f.repay(o, first.event.claims[0], "0.01");
  await f.repay(o, original.payment.event.claims[0], "0.03");
  await f.capacity("9.94", "0.00", "9.94", "0.06");
  f.assertHealthy();
});

test("rent corrections, reversals, reserve audit, status changes and owned permission boundaries", async ({
  page,
  context,
}) => {
  const f = await rentHarness(page, context);
  const plan = await f.createPlan("0.10");
  const o = (await f.generate(plan)).results[0];
  const reserve = await f.reserve(o, "0.10");
  const owner = await f.pay(o, "0.04");
  await f.capacity("9.96", "0.06", "9.90", "0.04");
  const corrected = await f.correct(o, owner, "0.05");
  expect(corrected.event.supersedes).toBe(owner.event.id);
  await f.capacity("9.95", "0.05", "9.90", "0.05");
  await f.reverse(o, corrected);
  await f.capacity("10.00", "0.10", "9.90", "0.00");
  const friend = await f.pay(o, "0.04", true);
  await f.capacity("10.00", "0.10", "9.90", "0.04", "0.04");
  const friendCorrected = await f.correct(o, friend, "0.05");
  await f.capacity("10.00", "0.10", "9.90", "0.05", "0.05");
  await f.reverse(o, friendCorrected);
  await f.capacity("10.00", "0.10", "9.90", "0.00");
  await f.adjust(reserve, "0.08");
  await f.capacity("10.00", "0.08", "9.92", "0.00");
  await f.adjust(reserve, "0.00");
  await f.capacity("10.00", "0.00", "10.00", "0.00");
  for (const action of ["Skip", "Reopen"] as const) {
    await page
      .getByTestId(`rent-obligation-${o.id}`)
      .getByRole("button", { name: action, exact: true })
      .click();
    await f
      .dialog()
      .getByLabel(/Auditable Reason/)
      .fill("Controlled auditable obligation " + action);
    await f.commit(
      `/api/v1/rent/obligations/${o.id}/change-status/`,
      action === "Skip" ? "Confirm Skip" : "Confirm Reopen"
    );
  }
  const audit = await f.get<{ results: { action: string }[] }>(`rent/obligations/${o.id}/history/`);
  expect(audit.results.map((h) => h.action)).toEqual(expect.arrayContaining(["skip", "reopen"]));
  await page.getByRole("button", { name: "Configure Plan", exact: true }).click();
  await f.dialog().getByLabel("Active Rent Plan", { exact: true }).uncheck();
  const patch = page.waitForResponse((r) => posted(r, `/api/v1/rent/plans/${plan.id}/`, "PATCH"), {
    timeout: 60_000,
  });
  await f.dialog().getByRole("button", { name: "Save Active Status", exact: true }).click();
  expect((await patch).status()).toBe(201);
  await expect(f.dialog()).not.toBeVisible();
  const post = async (path: string, data: object) =>
    f.api.post(`${backendOrigin}/api/v1/${path}`, {
      headers: await f.headers(),
      data,
      timeout: 60_000,
    });
  expect((await post(`rent/plans/${plan.id}/generate/`, { through: f.date })).status()).toBe(409);
  expect(
    (
      await f.api.patch(`${backendOrigin}/api/v1/rent/plans/${plan.id}/`, {
        headers: await f.headers(),
        data: { amount: "0.99" },
        timeout: 60_000,
      })
    ).status()
  ).toBe(400);
  const p = `rent/obligations/${o.id}/payments/`;
  const valid = { amount: "0.01", account: f.account.id, effective_date: f.date };
  expect((await post(p, { ...valid, payer: f.contact.id })).status()).toBe(400);
  expect((await post(p, { ...valid, amount: "-0.01" })).status()).toBe(400);
  expect((await post(p, { ...valid, amount: "0.001" })).status()).toBe(400);
  expect((await post(p, { ...valid, amount: "1.00" })).status()).toBe(409);
  const missingCsrf = await f.headers();
  delete (missingCsrf as Partial<typeof missingCsrf>)["X-CSRFToken"];
  expect(
    (
      await f.api.post(`${backendOrigin}/api/v1/${p}`, { headers: missingCsrf, data: valid })
    ).status()
  ).toBe(403);
  const other = await request.newContext({ baseURL: frontendOrigin });
  const email = `kivo-p5-isolation-${randomUUID()}@example.test`,
    password = randomUUID() + "!K7";
  expect(
    (
      await authPost(other, "/api/v1/auth/register/", {
        name: "Part 5 isolated user",
        email,
        password,
      })
    ).status()
  ).toBe(201);
  expect((await authPost(other, "/api/v1/auth/login/", { email, password })).status()).toBe(200);
  const state = await other.storageState();
  const foreignHeaders = {
    Origin: frontendOrigin,
    "X-CSRFToken": state.cookies.find((c) => c.name === "csrftoken")!.value,
    "Idempotency-Key": randomUUID(),
    Cookie: state.cookies.map((c) => c.name + "=" + c.value).join("; "),
  };
  for (const path of [
    `rent/plans/${plan.id}/`,
    `rent/plans/${plan.id}/obligations/`,
    `rent/obligations/${o.id}/`,
    p,
    `rent/obligations/${o.id}/history/`,
    `rent/payments/${owner.id}/`,
    `rent/reserves/${reserve.id}/`,
    `rent/reserves/${reserve.id}/history/`,
  ])
    expect(
      (
        await other.get(`${backendOrigin}/api/v1/${path}`, {
          headers: foreignHeaders,
          timeout: 60_000,
        })
      ).status(),
      path
    ).toBe(404);
  expect(
    (
      await other.post(`${backendOrigin}/api/v1/${p}`, {
        headers: foreignHeaders,
        data: valid,
        timeout: 60_000,
      })
    ).status()
  ).toBe(404);
  expect(
    (
      await other.post(`${backendOrigin}/api/v1/rent/reserves/${reserve.id}/adjust/`, {
        headers: foreignHeaders,
        data: { amount: "0.00", reason: "Unauthorized foreign test" },
        timeout: 60_000,
      })
    ).status()
  ).toBe(404);
  await other.dispose();
  const anon = await request.newContext();
  expect((await anon.get(`${backendOrigin}/api/v1/rent/plans/`)).status()).toBe(401);
  await anon.dispose();
  await f.capacity("10.00", "0.00", "10.00", "0.00");
  f.assertHealthy();
});

test("calendar generation clamps due day 31, handles leap February and prevents duplicate obligations", async ({
  page,
  context,
}) => {
  const f = await rentHarness(page, context);
  const plan = await f.createPlan("0.01", { start: "2027-01-01", day: 31 });
  const generated = await f.generate(plan, "2028-02-29");
  expect(generated.count).toBe(14);
  for (const [month, due] of [
    ["2027-02-01", "2027-02-28"],
    ["2028-02-01", "2028-02-29"],
    ["2027-04-01", "2027-04-30"],
  ])
    expect(generated.results.find((o) => o.month === month)?.due_date).toBe(due);
  expect((await f.generate(plan, "2028-02-29")).count).toBe(14);
  const lastDay = await f.createPlan("0.03", {
    start: "2028-02-01",
    day: null,
    title: f.run + " Leap month end",
    shared: true,
    custom: { owner: "0.01", friend: "0.02" },
  });
  expect(lastDay.due_day).toBeNull();
  expect(lastDay.shares).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ contact: null, amount: "0.01" }),
      expect.objectContaining({ contact: f.contact.id, amount: "0.02" }),
    ])
  );
  expect((await f.generate(lastDay, "2028-02-29")).results[0].due_date).toBe("2028-02-29");
  const input = {
    title: f.run + " invalid calendar",
    payee: "Development landlord",
    amount: "0.01",
    category: f.category.id,
    start_date: "2027-01-01",
    due_day: 32,
  };
  for (const data of [input, { ...input, due_day: 1, start_date: "2027-02-29" }]) {
    const invalid = await f.api.post(`${backendOrigin}/api/v1/rent/plans/`, {
      headers: await f.headers(),
      data,
      timeout: 60_000,
    });
    expect(invalid.status()).toBe(400);
  }
  await f.capacity("10.00", "0.00", "10.00", "0.00");
  f.assertHealthy();
});
