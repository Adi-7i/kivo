import { test, expect, request } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { part6Harness, csvRecords } from "./part6-live";
import { frontendOrigin, posted, authPost } from "./live-api";
import type { BudgetDTO } from "../src/features/budgets/api";
import type { EventDTO, AccountDTO } from "../src/features/finance/api";
import type { BillDTO } from "../src/features/relationships/api";
import type { SummaryDTO, BreakdownDTO } from "../src/features/reports/api";
import type { DashboardDTO } from "../src/features/dashboard/api";

test.use({ storageState: { cookies: [], origins: [] } });
test.describe.configure({ retries: 0 });
test.setTimeout(1_200_000);

test("real budget create/edit/archive, expense utilization, audited corrections and cross-module refresh", async ({
  page,
  context,
}) => {
  const f = await part6Harness(page, context);
  // Journey B receives real external funds before configuring limits; opening
  // equity remains separate from income throughout the budget/correction flow.
  await page.goto("/transactions");
  await page.getByRole("button", { name: "Quick Add", exact: true }).click();
  await f.dialog().getByRole("tab", { name: "Received", exact: true }).click();
  await f.dialog().locator("#receipt-amount").fill("0.10");
  await f
    .dialog()
    .locator("#receipt-title")
    .fill(f.run + " Received funds");
  await f.dialog().locator("#receipt-account").selectOption(f.account.id);
  await f
    .dialog()
    .locator("#receipt-source")
    .fill(f.run + " Development receipt");
  const receipt = await f.commit<EventDTO>("/api/v1/transactions/", "Record Receipt", true);
  expect(receipt).toMatchObject({ kind: "receipt", amount: "0.10" });
  const overall = await f.budget("0.05"),
    category = await f.budget("0.04", true);
  await f.progress(overall, { spent: "0.00", remaining: "0.05", warning_state: "ok" });
  const first = await f.expense("0.03");
  await f.nav("Budgets");
  await f.progress(overall, {
    spent: "0.03",
    remaining: "0.02",
    warning_state: "warning",
    utilization_percent: "60.00",
  });
  await f.progress(category, {
    spent: "0.03",
    remaining: "0.01",
    warning_state: "warning",
    utilization_percent: "75.00",
  });
  const second = await f.expense("0.03");
  await f.nav("Budgets");
  await f.progress(overall, {
    spent: "0.06",
    remaining: "-0.01",
    overspending: "0.01",
    warning_state: "exceeded",
  });
  await f.progress(category, { spent: "0.06", overspending: "0.02", warning_state: "exceeded" });
  await f.report();
  const corrected = await f.correction(second, "0.01");
  expect(corrected.supersedes).toBe(second.id);
  await f.nav("Budgets");
  await f.progress(overall, { spent: "0.04", remaining: "0.01", warning_state: "warning" });
  await f.progress(category, { spent: "0.04", remaining: "0.00", warning_state: "at_limit" });
  const summaryBefore = await f.report();
  expect(summaryBefore.personal_expense).toBe("0.04");
  await f.correction(corrected);
  await f.nav("Budgets");
  await f.progress(overall, { spent: "0.03", remaining: "0.02" });
  await page
    .getByTestId("budget-card-" + overall.id)
    .getByRole("button", { name: /Edit/ })
    .click();
  await f.dialog().locator("#budget-amount").fill("0.02");
  const updated = await f.commit<BudgetDTO>(
    "/api/v1/budgets/" + overall.id + "/",
    "Update Budget",
    true
  );
  expect(updated.warning_state).toBe("exceeded");
  await f.progress(overall, { limit: "0.02", spent: "0.03", remaining: "-0.01" });
  await page
    .getByTestId("budget-card-" + overall.id)
    .getByRole("button", { name: /Edit/ })
    .click();
  await f.dialog().getByLabel("Archived", { exact: true }).check();
  await f.commit("/api/v1/budgets/" + overall.id + "/", "Update Budget");
  await expect(page.getByTestId("budget-card-" + overall.id)).not.toBeVisible();
  await page.getByLabel("Budget archive filter").selectOption("true");
  await expect(page.getByTestId("budget-card-" + overall.id)).toContainText("Archived");
  await page
    .getByTestId("budget-card-" + overall.id)
    .getByRole("button", { name: /Edit/ })
    .click();
  await f.dialog().getByLabel("Archived", { exact: true }).uncheck();
  await f.commit("/api/v1/budgets/" + overall.id + "/", "Update Budget");
  await page.getByLabel("Budget archive filter").selectOption("false");
  await f.progress(overall, { archived: false, spent: "0.03" });
  const duplicate = await f.api.post(frontendOrigin + "/api/v1/budgets/", {
    headers: await f.headers(),
    data: {
      name: "Overlapping " + f.run,
      period_start: overall.period_start,
      period_end: overall.period_end,
      limit: "1.00",
    },
    timeout: 60_000,
  });
  expect(duplicate.status()).toBe(400);
  const previous = new Date(f.date.slice(0, 7) + "-01T00:00:00Z");
  previous.setUTCDate(0);
  const last = previous.toISOString().slice(0, 10),
    start = last.slice(0, 7) + "-01";
  const zero = await f.budget("0.00", false, { start, end: last });
  await page.getByLabel("All periods", { exact: true }).check();
  await f.progress(zero, {
    limit: "0.00",
    spent: "0.00",
    remaining: "0.00",
    utilization_percent: null,
    warning_state: "ok",
  });
  await f.fixture("transactions/", {
    kind: "expense",
    amount: "0.01",
    effective_date: last,
    account: f.account.id,
    category: f.category.id,
    title: "Previous period " + f.run,
  });
  // External supported fixture writes require a real reload; in-app mutations above exercised invalidation.
  await page.reload();
  await page.getByLabel("All periods", { exact: true }).check();
  await f.progress(zero, {
    spent: "0.01",
    remaining: "-0.01",
    overspending: "0.01",
    utilization_percent: null,
    warning_state: "exceeded",
  });
  const summary = await f.report();
  expect(summary.personal_expense).toBe("0.03");
  expect(await f.get<DashboardDTO>("dashboard/?period=month")).toMatchObject({
    liquid_balance: "10.06",
    selected_period: { personal_expense: "0.03", external_income: "0.10" },
  });
  expect(await f.get<EventDTO>("transactions/" + first.id + "/")).toMatchObject({
    status: "posted",
    amount: "0.03",
  });
  f.assertHealthy();
});

test("real reports preserve loan/shared/rent classifications and filtered UTF-8 CSV contribution accuracy", async ({
  page,
  context,
}) => {
  const f = await part6Harness(page, context, "20.00");
  const a2 = await f.fixture<AccountDTO>("accounts/", {
    name: f.run + " Wallet",
    kind: "wallet",
    opening_balance: "0.00",
    opened_on: f.date,
  });
  const tx = async (kind: string, amount: string, extra: object = {}) =>
    f.fixture<EventDTO>("transactions/", {
      kind,
      amount,
      effective_date: f.date,
      account: f.account.id,
      title: f.run + " " + kind,
      ...extra,
    });
  await tx("receipt", "0.50", { funding_source: "Development receipt " + f.run });
  const expense = await tx("expense", "0.10", {
    category: f.category.id,
    title: "=Kivo " + f.run,
    merchant: "+Kivo merchant " + f.run,
    payment_method: "=UPI",
    notes: '=SUM(1), Café हिन्दी\n"quoted"',
  });
  await tx("transfer", "0.05", { destination: a2.id });
  const loan = await f.fixture<EventDTO>("loans/", {
    kind: "lend",
    amount: "0.07",
    account: f.account.id,
    contact: f.contact.id,
    effective_date: f.date,
    title: f.run + " lend",
  });
  const borrowing = await f.fixture<EventDTO>("loans/", {
    kind: "borrow",
    amount: "0.09",
    account: f.account.id,
    contact: f.contact.id,
    effective_date: f.date,
    title: f.run + " borrow",
  });
  const settle = async (claim: string, amount: string) =>
    f.fixture<EventDTO>("settlements/", {
      claim,
      amount,
      account: f.account.id,
      effective_date: f.date,
      title: f.run + " settlement",
    });
  await settle(loan.claims[0], "0.03");
  await settle(loan.claims[0], "0.04");
  await settle(borrowing.claims[0], "0.09");
  const owned = await f.fixture<BillDTO>("shared-bills/", {
    title: f.run + " owner bill",
    amount: "0.12",
    category: f.category.id,
    effective_date: f.date,
    account: f.account.id,
    payer: null,
    split_method: "custom",
    participants: [
      { contact: null, amount: "0.04" },
      { contact: f.contact.id, amount: "0.08" },
    ],
  });
  await settle(owned.event.claims[0], "0.08");
  const friend = await f.fixture<BillDTO>("shared-bills/", {
    title: f.run + " friend bill",
    amount: "0.10",
    category: f.category.id,
    effective_date: f.date,
    account: null,
    payer: f.contact.id,
    split_method: "custom",
    participants: [
      { contact: null, amount: "0.03" },
      { contact: f.contact.id, amount: "0.07" },
    ],
  });
  await settle(friend.event.claims[0], "0.01");
  await settle(friend.event.claims[0], "0.02");
  const plan = await f.createPlan("0.20");
  const obligation = (await f.generate(plan)).results[0];
  await f.reserve(obligation, "0.20");
  const rent = await f.pay(obligation, "0.20", true);
  await f.repay(obligation, rent.event.claims[0], "0.08");
  await f.repay(obligation, rent.event.claims[0], "0.12");
  const b = await f.budget("0.35");
  expect(await f.get<BudgetDTO>("budgets/" + b.id + "/")).toMatchObject({
    spent: "0.37",
    overspending: "0.02",
    warning_state: "exceeded",
  });
  const summary = await f.report();
  expect(summary).toMatchObject({
    personal_expense: "0.37",
    external_income: "0.50",
    money_received: "0.74",
    money_paid: "0.61",
    borrowed: "0.09",
    lent: "0.07",
    repayments_received: "0.15",
    payable_settlements: "0.32",
    internal_transfers: "0.05",
    shared_advances: "0.08",
    principal_repaid: "0.09",
    shared_settlements_paid: "0.23",
  });
  const capacity = await f.get("rent/spending-capacity/");
  expect(capacity).toEqual({
    liquid_balance: "20.13",
    active_reserves: "0.00",
    safe_to_spend: "20.13",
  });
  const breakdown = await f.get<BreakdownDTO>("reports/breakdown/?period=month&dimension=category");
  expect(breakdown.results).toEqual([
    expect.objectContaining({ key: f.category.id, amount: "0.37" }),
  ]);
  for (const [dimension, expected] of [
    [
      "account",
      [
        { key: f.account.id, amount: "0.14" },
        { key: null, amount: "0.23" },
      ],
    ],
    ["merchant", [{ key: expense.merchant, amount: "0.10" }]],
    ["payment_method", [{ key: expense.payment_method, amount: "0.10" }]],
    ["contact", [{ key: f.contact.id, amount: "0.23" }]],
    [
      "kind",
      [
        { key: "expense", amount: "0.10" },
        { key: "shared_paid", amount: "0.04" },
        { key: "shared_due", amount: "0.23" },
      ],
    ],
  ] as const) {
    const result = await f.get<BreakdownDTO>(
      "reports/breakdown/?period=month&dimension=" + dimension
    );
    expect(result.results).toEqual(
      expect.arrayContaining(expected.map((row) => expect.objectContaining(row)))
    );
  }
  await page.getByRole("button", { name: "By Type", exact: true }).click();
  await expect(
    page
      .locator("table")
      .filter({ has: page.getByText("kind · Net owner expense · INR", { exact: true }) })
  ).toContainText("shared_due");
  const params = {
    date_from: f.date,
    date_to: f.date,
    account: f.account.id,
    category: f.category.id,
    kind: "expense",
    merchant: expense.merchant,
    payment_method: expense.payment_method,
    search: f.run,
  };
  await f.report(params);
  await page.getByRole("button", { name: "Export CSV", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  const responsePromise = page.waitForResponse((r) => posted(r, "/api/v1/reports/export/", "GET"));
  await f.dialog().getByRole("button", { name: "Download CSV", exact: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const url = new URL(response.url());
  for (const [key, value] of Object.entries(params)) expect(url.searchParams.get(key)).toBe(value);
  expect(response.headers()["content-type"]).toContain("text/csv");
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-kivo-export-timezone"]).toBe("Asia/Kolkata");
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("kivo-transactions.csv");
  const bytes = await readFile((await download.path())!);
  expect([...bytes.subarray(0, 3)]).toEqual([239, 187, 191]);
  const rows = csvRecords(bytes.toString("utf8"));
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    transaction_id: expense.id,
    title: "'" + expense.title,
    merchant: "'" + expense.merchant,
    payment_method: "'" + expense.payment_method,
    notes: "'" + expense.notes,
    amount_inr: "0.10",
    net_expense_inr: "0.10",
    net_external_cash_inr: "-0.10",
  });
  await f.dialog().getByRole("button", { name: "Cancel", exact: true }).click();
  const detail = page.getByRole("link", { name: "View Filtered Transactions", exact: true });
  await detail.click();
  await expect(page).toHaveURL(/\/transactions\?/);
  await expect(
    page.getByRole("link", { name: "View details for " + expense.title, exact: true })
  ).toHaveAttribute("href", "/transactions/" + expense.id);
  const filtered = await f.get<{ count: number; results: EventDTO[] }>(
    "transactions/?" + new URLSearchParams(params)
  );
  expect(filtered.count).toBe(1);
  const allCsv = await f.api.get(frontendOrigin + "/api/v1/reports/export/?period=month", {
    timeout: 60_000,
  });
  expect(allCsv.status()).toBe(200);
  const allRows = csvRecords(await allCsv.text());
  const sum = (field: string) =>
    allRows.reduce((total, row) => total + BigInt(row[field].replace(".", "")), BigInt(0));
  expect(sum("net_expense_inr")).toBe(BigInt(summary.personal_expense.replace(".", "")));
  expect(sum("net_external_cash_inr")).toBe(BigInt(13));
  await page.goto("/reports?date_from=2020-01-01&date_to=2020-01-31");
  await expect(page.getByTestId("report-count")).toHaveText("0");
  await page.getByRole("button", { name: "Export CSV", exact: true }).click();
  const emptyDownload = page.waitForEvent("download");
  await f.dialog().getByRole("button", { name: "Download CSV", exact: true }).click();
  expect(
    csvRecords((await readFile((await (await emptyDownload).path())!)).toString("utf8"))
  ).toEqual([]);
  await expect(f.dialog().getByRole("status")).toContainText("headers only");
  f.assertHealthy();
});

test("real report calendars, budget replay recovery, strict validation, pagination and export ownership", async ({
  page,
  context,
}) => {
  const f = await part6Harness(page, context);
  await page.goto("/budgets");
  await page.getByRole("button", { name: "Set Monthly Budget", exact: true }).click();
  await f
    .dialog()
    .locator("#budget-name")
    .fill(f.run + " Ambiguous");
  await f.dialog().locator("#budget-amount").fill("0.00");
  let key = "",
    body: object = {},
    id = "";
  await page.route("**/api/v1/budgets**", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    key = route.request().headers()["idempotency-key"];
    body = route.request().postDataJSON();
    const actual = await route.fetch({ timeout: 60_000 });
    expect(actual.status()).toBe(201);
    id = (await actual.json()).id;
    await route.abort("failed");
  });
  await f.dialog().getByRole("button", { name: "Save Budget", exact: true }).dblclick();
  await expect(
    f.dialog().getByRole("button", { name: "Check request status", exact: true })
  ).toBeVisible();
  await page.unroute("**/api/v1/budgets**");
  await page.reload();
  await page.getByRole("button", { name: "Set Monthly Budget", exact: true }).click();
  await f.dialog().getByRole("button", { name: "Check request status", exact: true }).click();
  await expect(
    f.dialog().getByRole("button", { name: "Retry original request", exact: true })
  ).toBeVisible();
  const replay = page.waitForResponse((r) => posted(r, "/api/v1/budgets/"));
  await f.dialog().getByRole("button", { name: "Retry original request", exact: true }).click();
  const confirmation = await replay;
  expect(confirmation.status()).toBe(200);
  expect((await confirmation.json()).id).toBe(id);
  let originalRequest = confirmation.request();
  while (originalRequest.redirectedFrom()) originalRequest = originalRequest.redirectedFrom()!;
  expect((await originalRequest.allHeaders())["idempotency-key"]).toBe(key);
  expect(originalRequest.postDataJSON()).toEqual(body);
  await expect(f.dialog()).not.toBeVisible();
  const conflict = await f.api.post(frontendOrigin + "/api/v1/budgets/", {
    headers: await f.headers(key),
    data: { ...body, limit: "0.01" },
    timeout: 60_000,
  });
  expect(conflict.status()).toBe(409);
  expect((await f.get<{ count: number }>("budgets/")).count).toBe(1);
  for (const invalid of [
    { limit: "-1" },
    { limit: "0.001" },
    { warning_percent: 101 },
    { period_start: "2026-02-01", period_end: "2026-02-31" },
  ]) {
    const response = await f.api.patch(frontendOrigin + "/api/v1/budgets/" + id + "/", {
      headers: await f.headers(),
      data: invalid,
      timeout: 60_000,
    });
    expect(response.status()).toBe(400);
  }
  const noCsrf = await f.api.post(frontendOrigin + "/api/v1/budgets/", {
    headers: { Origin: frontendOrigin, "Idempotency-Key": randomUUID() },
    data: body,
  });
  expect(noCsrf.status()).toBe(403);
  for (const period of [
    "today",
    "yesterday",
    "week",
    "last_seven_days",
    "month",
    "previous_month",
    "year",
  ]) {
    const data = await f.get<SummaryDTO>("reports/summary/?period=" + period);
    expect(data.period.timezone).toBe("Asia/Kolkata");
    await page.goto("/reports?period=" + period);
    await expect(page.getByTestId("report-period")).toContainText(
      data.period.period_start + " to " + data.period.period_end
    );
    if (period === "week")
      expect(new Date(data.period.period_start + "T00:00:00Z").getUTCDay()).toBe(1);
    if (period === "last_seven_days") expect(data.period.calendar_days).toBe(7);
  }
  for (const query of [
    "period=month&period=year",
    "period=month&date=2026-10-01",
    "account=invalid",
    "date=2027-02-29",
    "date_from=2026-11-01&date_to=2026-10-01",
    "amount_min=1&amount_max=0.99",
  ]) {
    const response = await f.api.get(frontendOrigin + "/api/v1/reports/summary/?" + query);
    expect(response.status()).toBe(400);
  }
  const previous = await f.fixture<EventDTO>("transactions/", {
    kind: "expense",
    amount: "0.01",
    effective_date: "2025-09-01",
    account: f.account.id,
    category: f.category.id,
    title: f.run + " historical",
  });
  const selected = await f.fixture<EventDTO>("transactions/", {
    kind: "expense",
    amount: "0.02",
    effective_date: "2025-10-01",
    account: f.account.id,
    category: f.category.id,
    title: f.run + " selected",
  });
  const custom = await f.report({ date_from: "2025-10-01", date_to: "2025-10-31" });
  expect(custom).toMatchObject({
    personal_expense: "0.02",
    average_daily_expense: "0.00",
    highest_spending_day: { date: "2025-10-01", amount: "0.02" },
    comparison: {
      personal_expense: "0.01",
      difference: "0.01",
      percentage_difference: "100.00",
      comparable: true,
    },
  });
  // 21 isolated calendar scopes exercise actual backend budget pagination without financial postings.
  for (let month = 1; month <= 21; month++) {
    const year = 2022 + Math.floor((month - 1) / 12),
      m = String(((month - 1) % 12) + 1).padStart(2, "0"),
      start = year + "-" + m + "-01";
    await f.fixture("budgets/", {
      name: f.run + " Historical " + month,
      period_type: "custom",
      period_start: start,
      period_end: start,
      limit: "0.00",
    });
  }
  const first = await f.get<{ count: number; next: string; results: BudgetDTO[] }>(
      "budgets/?page=1"
    ),
    second = await f.get<{ count: number; previous: string; results: BudgetDTO[] }>(
      "budgets/?page=2"
    );
  expect(first.count).toBe(22);
  expect(first.results).toHaveLength(20);
  expect(second.results).toHaveLength(2);
  expect(first.next).toBeTruthy();
  expect(second.previous).toBeTruthy();
  await page.goto("/budgets");
  await page.getByLabel("All periods", { exact: true }).check();
  await expect(page.locator('[data-testid^="budget-card-"]')).toHaveCount(22);
  const other = await request.newContext();
  const email = "p6-foreign-" + randomUUID() + "@example.test",
    password = "Kivo-Dev-" + randomUUID() + "!7";
  expect(
    (
      await authPost(other, "/api/v1/auth/register/", {
        email,
        password,
        name: "P6 foreign development identity",
      })
    ).status()
  ).toBe(201);
  expect((await authPost(other, "/api/v1/auth/login/", { email, password })).status()).toBe(200);
  expect((await other.get(frontendOrigin + "/api/v1/budgets/" + id + "/")).status()).toBe(404);
  const foreignExport = await other.get(
    frontendOrigin + "/api/v1/reports/export/?period=all&account=" + f.account.id
  );
  expect(foreignExport.status()).toBe(200);
  expect(csvRecords(await foreignExport.text())).toEqual([]);
  const foreignSummary = await other.get(
    frontendOrigin + "/api/v1/reports/summary/?period=all&account=" + f.account.id
  );
  expect((await foreignSummary.json()).personal_expense).toBe("0.00");
  const otherAll = await other.get(frontendOrigin + "/api/v1/reports/export/?period=all");
  expect(otherAll.status()).toBe(200);
  expect(csvRecords(await otherAll.text())).toEqual([]);
  const state = await other.storageState();
  const forbiddenWrite = await other.patch(frontendOrigin + "/api/v1/budgets/" + id + "/", {
    headers: {
      Origin: frontendOrigin,
      "X-CSRFToken": state.cookies.find((c) => c.name === "csrftoken")!.value,
      "Idempotency-Key": randomUUID(),
    },
    data: { limit: "0.01" },
  });
  expect(forbiddenWrite.status()).toBe(404);
  const anonymous = await request.newContext();
  expect((await anonymous.get(frontendOrigin + "/api/v1/reports/export/")).status()).toBe(401);
  expect((await anonymous.get(frontendOrigin + "/api/v1/reports/summary/")).status()).toBe(401);
  // Journey G uses the same browser and filter key across a confirmed logout.
  // B has an owned zero-opening account solely to complete the supported route guard.
  const otherAccount = await other.post(frontendOrigin + "/api/v1/accounts/", {
    headers: {
      Origin: frontendOrigin,
      "X-CSRFToken": state.cookies.find((c) => c.name === "csrftoken")!.value,
      "Idempotency-Key": randomUUID(),
    },
    data: {
      name: "Kivo Part6 isolation B",
      kind: "cash",
      opened_on: f.date,
      opening_balance: "0.00",
    },
    timeout: 35_000,
  });
  expect(otherAccount.status()).toBe(201);
  expect(
    (await f.report({ date_from: "2025-10-01", date_to: "2025-10-31" })).personal_expense
  ).toBe("0.02");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await page
    .locator("form:visible")
    .getByLabel(/Email address/i)
    .fill(email);
  await page
    .locator("form:visible")
    .getByLabel(/^Password/i)
    .fill(password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  await f.nav("Budgets");
  await expect(page.locator('[data-testid^="budget-card-"]')).toHaveCount(0);
  await expect(page.getByText("No Spending Budgets Configured", { exact: true })).toBeVisible();
  await f.nav("Reports & Analytics");
  await page.getByRole("button", { name: "Custom Range", exact: true }).click();
  await page.locator("#report-date_from").fill("2025-10-01");
  await page.locator("#report-date_to").fill("2025-10-31");
  await page.getByRole("button", { name: "Apply Filters", exact: true }).click();
  await expect(page.getByTestId("report-period")).toContainText("2025-10-01 to 2025-10-31");
  await expect(page.getByTestId("report-expense")).toHaveText("₹0.00");
  await expect(page.getByTestId("report-income")).toHaveText("₹0.00");
  await page.getByRole("button", { name: "Export CSV", exact: true }).click();
  const isolatedDownload = page.waitForEvent("download", { timeout: 20_000 });
  await f.dialog().getByRole("button", { name: "Download CSV", exact: true }).click();
  expect(
    csvRecords((await readFile((await (await isolatedDownload).path())!)).toString("utf8"))
  ).toEqual([]);
  await f.dialog().getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  expect((await page.request.get(frontendOrigin + "/api/v1/reports/export/")).status()).toBe(401);
  await other.dispose();
  await anonymous.dispose();
  expect(previous.id).not.toBe(selected.id);
  f.assertHealthy();
});
