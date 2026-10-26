import { test, expect, request as playwrightRequest } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { authPost, frontendOrigin, backendOrigin, openResource, posted } from "./live-api";
import { confirmUiFinancial } from "./financial-ui";
import { todayInKolkata } from "../src/features/onboarding/money";

test.use({ storageState: { cookies: [], origins: [] } });
test("real Django dashboard, pinned FIFO journey, exhaustion, corrections and isolation", async ({
  page,
  context,
}) => {
  test.setTimeout(600_000);
  const run = `p3-${Date.now()}-${randomUUID().slice(0, 6)}`;
  const password = `${randomBytes(24).toString("base64url")}!a7`,
    email = `kivo-${run}@example.test`;
  const api = context.request,
    date = todayInKolkata();
  expect(
    (
      await authPost(api, "/api/v1/auth/register/", { name: `Kivo ${run}`, email, password })
    ).status()
  ).toBe(201);
  expect((await authPost(api, "/api/v1/auth/login/", { email, password })).status()).toBe(200);
  const headers = async () => {
    const cookies = await context.cookies();
    return {
      Origin: frontendOrigin,
      "X-CSRFToken": cookies.find((c) => c.name === "csrftoken")!.value,
      "Idempotency-Key": randomUUID(),
      Cookie: cookies
        .filter((c) => ["sessionid", "csrftoken"].includes(c.name))
        .map((c) => `${c.name}=${c.value}`)
        .join("; "),
    };
  };
  // Fixture-only supported Django workflows, including loans/repayments to verify Part 3 classification.
  // This is not Part 4 frontend implementation; no direct database access or fake responses.
  const write = async (path: string, body: object) => {
    const response = await api.post(`${backendOrigin}/api/v1/${path}/`, {
      data: body,
      headers: await headers(),
      timeout: 60_000,
    });
    expect(response.status(), `Unconfirmed fixture ${path}; no automatic POST retry`).toBe(201);
    return response.json();
  };
  const get = async (path: string) => {
    const response = await api.get(`${frontendOrigin}/api/v1/${path}`);
    expect(response.status()).toBe(200);
    return response.json();
  };
  await openResource(page, "/dashboard", "/api/v1/dashboard/");
  const empty = await get("dashboard/?period=month");
  expect(empty.liquid_balance).toBe("0.00");
  await expect(
    page.getByText("No recent transactions recorded yet.", { exact: false })
  ).toBeVisible();
  await page.goto("/money/sources");
  await expect(page.getByText("No Funding Sources Found", { exact: true })).toBeVisible();
  const bank = await write("accounts", {
    name: `${run} Bank`,
    kind: "bank",
    opened_on: date,
    opening_balance: "0.00",
  });
  const cash = await write("accounts", {
    name: `${run} Cash`,
    kind: "cash",
    opened_on: date,
    opening_balance: "0.00",
  });
  const category = await write("categories", { name: `${run} Category` });
  const contact = await write("contacts", { display_name: `${run} Friend` });
  const receipt = await write("transactions", {
    kind: "receipt",
    amount: "3.00",
    account: bank.id,
    effective_date: date,
    title: `${run} receipt`,
    funding_source: `${run} Development funds`,
  });
  const loan = await write("loans", {
    kind: "lend",
    amount: "0.50",
    account: bank.id,
    contact: contact.id,
    effective_date: date,
    title: `${run} lend`,
  });
  let dashboard = await get("dashboard/?period=month");
  expect(dashboard).toMatchObject({
    liquid_balance: "2.50",
    safe_to_spend: "2.50",
    receivables: "0.50",
    payables: "0.00",
    reserved: "0.00",
    spending: { today: "0.00", week: "0.00", month: "0.00", year: "0.00" },
    selected_period: { external_income: "3.00", personal_expense: "0.00" },
  });
  await write("transactions", {
    kind: "transfer",
    amount: "1.00",
    account: bank.id,
    destination: cash.id,
    effective_date: date,
    title: `${run} transfer`,
  });
  await write("transactions", {
    kind: "expense",
    amount: "1.00",
    account: cash.id,
    category: category.id,
    effective_date: date,
    title: `${run} expense`,
  });
  dashboard = await get("dashboard/?period=month");
  expect(dashboard).toMatchObject({
    liquid_balance: "1.50",
    receivables: "0.50",
    selected_period: {
      external_income: "3.00",
      personal_expense: "1.00",
      internal_transfers: "1.00",
      lent: "0.50",
    },
  });
  const accounts = await get("accounts/");
  for (const row of dashboard.accounts)
    expect(row.balance).toBe(accounts.results.find((a: { id: string }) => a.id === row.id).balance);
  const summary = await get("funds/summary/");
  expect(summary).toMatchObject({
    attribution_status: "complete",
    original_amount: "3.00",
    allocated_amount: "1.00",
    remaining_capacity: "2.00",
  });
  const batches = await get(`funds/batches/?run=${summary.run_id}`);
  const batch = batches.results.find(
    (b: { source_event: string }) => b.source_event === receipt.id
  );
  expect(batch.receivable_positions).toEqual([{ claim: loan.claims[0], amount: "0.50" }]);
  expect(batch.remaining_capacity).toBe("2.00");
  expect(batch.exhausted_on).toBeNull();
  const journey = await get(`funds/batches/${batch.id}/journey/?run=${summary.run_id}`);
  expect(journey.results.map((r: { kind: string }) => r.kind)).toEqual(
    expect.arrayContaining(["advance", "transfer", "expense"])
  );
  expect(journey.results.every((r: { run_id: string }) => r.run_id === summary.run_id)).toBe(true);
  await openResource(page, "/dashboard", "/api/v1/dashboard/");
  await expect(page.getByTestId("dashboard-metrics")).toContainText("₹1.50");
  await expect(page.getByTestId("dashboard-metrics")).toContainText("₹0.50");
  await expect(page.getByTestId("dashboard-metrics")).toContainText("₹3.00");
  await page.goto(`/money/sources/${batch.id}`);
  await expect(page.getByText("Chronological Fund Journey", { exact: true })).toBeVisible();
  await expect(page.getByText(`${run} expense`, { exact: false })).toBeVisible();
  await expect(page.getByText(`Receivable ${loan.claims[0]}`, { exact: false })).toBeVisible();
  await expect(page.getByTestId("funding-status")).toHaveAttribute(
    "data-snapshot-id",
    summary.run_id
  );
  const foreign = await playwrightRequest.newContext({
    storageState: ".playwright-auth/session.json",
  });
  expect((await foreign.get(`${frontendOrigin}/api/v1/funds/batches/${batch.id}/`)).status()).toBe(
    404
  );
  expect(
    (await foreign.get(`${frontendOrigin}/api/v1/funds/summary/?run=${summary.run_id}`)).status()
  ).toBe(404);
  await foreign.dispose();
  await write("settlements", {
    claim: loan.claims[0],
    account: bank.id,
    amount: "0.50",
    effective_date: date,
    title: `${run} repayment`,
  });
  const fullExpense = await write("transactions", {
    kind: "expense",
    amount: "2.00",
    account: bank.id,
    category: category.id,
    effective_date: date,
    title: `${run} exhaust`,
  });
  const exhausted = await get(`funds/batches/${batch.id}/`);
  expect(exhausted).toMatchObject({
    remaining_capacity: "0.00",
    exhausted_on: date,
    elapsed_calendar_days: 1,
  });
  await page.goto(`/money/sources/${batch.id}`);
  await expect(page.getByText(/1 inclusive calendar days/)).toBeVisible();
  await openResource(
    page,
    `/transactions/${fullExpense.id}`,
    `/api/v1/transactions/${fullExpense.id}/`
  );
  await page.getByRole("button", { name: "Record Reversal / Correction" }).click();
  await page.getByRole("button", { name: "Correct", exact: true }).click();
  await page.getByLabel("Audit Reason").fill("Part 3 verify attribution refresh");
  await page.getByLabel("Corrected amount", { exact: true }).fill("1.99");
  const response = page.waitForResponse((r) =>
    posted(r, `/api/v1/transactions/${fullExpense.id}/correct/`)
  );
  await page.getByRole("button", { name: "Save Correction" }).click();
  const corrected = await confirmUiFinancial(
    page,
    await response,
    `/api/v1/transactions/${fullExpense.id}/correct/`
  );
  expect(corrected.supersedes).toBe(fullExpense.id);
  const restored = await get(`funds/batches/${batch.id}/`);
  expect(restored).toMatchObject({
    remaining_capacity: "0.01",
    exhausted_on: null,
    elapsed_calendar_days: null,
  });
  expect(restored.run_id).not.toBe(exhausted.run_id);
  const historical = await get(`funds/batches/${batch.id}/?run=${exhausted.run_id}`);
  expect(historical.remaining_capacity).toBe("0.00");
  dashboard = await get("dashboard/?period=month");
  expect(dashboard).toMatchObject({
    liquid_balance: "0.01",
    receivables: "0.00",
    selected_period: {
      external_income: "3.00",
      personal_expense: "2.99",
      repayments_received: "0.50",
    },
  });
  await openResource(page, "/dashboard", "/api/v1/dashboard/");
  await expect(page.getByTestId("dashboard-metrics")).toContainText("₹0.01");
  await page.goto(`/money/sources/${batch.id}`);
  await expect(page.getByTestId("funding-status")).toHaveAttribute(
    "data-snapshot-id",
    restored.run_id
  );
  await expect(page.getByText(/inclusive calendar days/)).not.toBeVisible();
  console.log(
    "Part 3 real Django: authoritative dashboard, lending classification, transfer lineage, repayment, exhaustion, correction, retained snapshots and cross-user isolation confirmed."
  );
});
