import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { csvRecords } from "./part6-live";
import { formatInr } from "../src/lib/formatters/currency";
import { decimalPaise } from "../src/features/finance/api";
test.describe("Live Budgets, Reports and authenticated CSV screens", () => {
  // Multi-request chart/filter journeys need an observation budget, not longer API deadlines.
  test.describe.configure({ timeout: 120_000, retries: 0 });
  test.beforeEach(async ({ page }) => {
    if (process.env.KIVO_E2E_READ_ONLY !== "1") return;
    await page.route("**/api/v1/**", (route) => {
      if (["GET", "HEAD"].includes(route.request().method())) return route.fallback();
      return route.fulfill({
        status: 405,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Read-only verification forbids API mutations." }),
      });
    });
  });
  test("budgets show actual owned limits, spending and independent remaining amounts", async ({
    page,
  }) => {
    await page.goto("/budgets");
    await expect(
      page.getByRole("heading", { name: "Budget Management", exact: true })
    ).toBeVisible();
    const id = process.env.KIVO_E2E_BUDGET_A!;
    const response = await page.request.get("/api/v1/budgets/" + id + "/");
    expect(response.status()).toBe(200);
    const data = await response.json();
    const card = page.getByTestId("budget-card-" + id);
    await expect(card).toContainText(data.name);
    await expect(card.getByTestId("budget-spent")).toHaveText(formatInr(decimalPaise(data.spent)));
    await expect(card.getByTestId("budget-budget-remaining")).toHaveText(
      formatInr(decimalPaise(data.remaining))
    );
    await expect(
      page.getByText("Budget Remaining ≠ Actual Account Balance ≠ Safe-to-Spend", { exact: true })
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: "Preview" })).toHaveCount(0);
  });
  test("category search, warning state and archive filters use loaded owned budgets", async ({
    page,
  }) => {
    await page.goto("/budgets");
    await expect(
      page.getByTestId("budget-card-" + process.env.KIVO_E2E_CATEGORY_BUDGET_A)
    ).toBeVisible();
    await page
      .getByRole("textbox", { name: "Search category budgets", exact: true })
      .fill("no-such-development-category");
    await expect(page.getByText("No category budgets match this period and filter.")).toBeVisible();
    await page.getByRole("textbox", { name: "Search category budgets", exact: true }).fill("");
    await page.getByLabel("Budget archive filter").selectOption("true");
    await expect(page.getByText("No Spending Budgets Configured", { exact: true })).toBeVisible();
  });
  test("budget period navigation changes the actual selection", async ({ page }) => {
    await page.goto("/budgets");
    await expect(page.getByTestId("budget-card-" + process.env.KIVO_E2E_BUDGET_A)).toBeVisible();
    await page.getByRole("button", { name: "Previous month", exact: true }).click();
    await expect(
      page.getByTestId("budget-card-" + process.env.KIVO_E2E_BUDGET_A)
    ).not.toBeVisible();
    await page.getByRole("button", { name: "Next month", exact: true }).click();
    await expect(page.getByTestId("budget-card-" + process.env.KIVO_E2E_BUDGET_A)).toBeVisible();
  });
  test("budget form uses real categories and validates invalid precision and threshold", async ({
    page,
  }) => {
    await page.goto("/budgets");
    await page.getByRole("button", { name: "Add Category Budget", exact: true }).click();
    const modal = page.getByRole("dialog");
    await modal.locator("#budget-name").fill("Invalid form only");
    await modal.locator("#budget-category").selectOption(process.env.KIVO_E2E_CATEGORY_A!);
    await modal.locator("#budget-amount").fill("0.001");
    await modal.locator("#budget-warning").fill("101");
    await modal.getByRole("button", { name: "Save Budget", exact: true }).click();
    await expect(modal.getByText(/at most two decimals/)).toBeVisible();
    await expect(modal.getByText("Use a whole percentage from 1 to 100")).toBeVisible();
    await modal.getByRole("button", { name: "Cancel", exact: true }).click();
  });
  test("budget edit loads actual configuration and offers supported archival", async ({ page }) => {
    await page.goto("/budgets");
    await page
      .getByTestId("budget-card-" + process.env.KIVO_E2E_BUDGET_A)
      .getByRole("button", { name: /Edit/ })
      .click();
    const modal = page.getByRole("dialog");
    await expect(modal.locator("#budget-amount")).toHaveValue("1.00");
    await expect(modal.locator("#budget-warning")).toHaveValue("50");
    await expect(modal.getByLabel("Archived", { exact: true })).not.toBeChecked();
    await expect(modal.getByRole("button", { name: /Delete/ })).toHaveCount(0);
  });
  test("budget read loading and failure stay distinct from empty data (injected read failure)", async ({
    page,
  }) => {
    let release: () => void = () => {};
    const waiting = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/v1/budgets**", async (route) => {
      await waiting;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Simulated budget read outage" }),
      });
    });
    await page.goto("/budgets");
    await expect(page.getByLabel("Loading budgets")).toBeVisible();
    release();
    await expect(
      page.getByRole("alert").filter({ hasText: "Simulated budget read outage" })
    ).toBeVisible();
    await expect(
      page.getByText("No Spending Budgets Configured", { exact: true })
    ).not.toBeVisible();
    await page.unroute("**/api/v1/budgets**");
    await page.getByRole("button", { name: "Retry loading", exact: true }).click();
    await expect(page.getByTestId("budget-card-" + process.env.KIVO_E2E_BUDGET_A)).toBeVisible();
  });
  test("reports render actual summaries, comparisons and accessible charts", async ({ page }) => {
    await page.goto("/reports");
    const response = await page.request.get("/api/v1/reports/summary/?period=month");
    expect(response.status()).toBe(200);
    const data = await response.json();
    await expect(page.getByTestId("report-expense")).toHaveText(
      formatInr(decimalPaise(data.personal_expense))
    );
    await expect(page.getByTestId("report-income")).toHaveText(
      formatInr(decimalPaise(data.external_income))
    );
    await expect(
      page.getByRole("heading", { name: "Cycle-over-Cycle Comparison", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Spending Velocity & Trend", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Expense Allocation by Category", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: "Selected period external income and personal expense in INR" })
    ).toBeVisible();
  });
  test("trend intervals and breakdown channels request exact server parameters", async ({
    page,
  }) => {
    await page.goto("/reports");
    await page.getByRole("button", { name: "Weekly", exact: true }).click();
    await expect(
      page.getByRole("img", { name: "week personal expense trend in INR" })
    ).toBeVisible();
    await page.getByRole("button", { name: "Monthly", exact: true }).click();
    await expect(
      page.getByRole("img", { name: "month personal expense trend in INR" })
    ).toBeVisible();
    for (const [label, dimension] of [
      ["By Method", "payment_method"],
      ["By Merchant", "merchant"],
      ["By Person", "contact"],
      ["By Type", "kind"],
      ["By Account", "account"],
    ]) {
      await page.getByRole("button", { name: label, exact: true }).click();
      await expect(
        page.getByRole("table").filter({
          has: page.getByText(dimension + " · Net owner expense · INR", { exact: true }),
        })
      ).toBeVisible();
    }
  });
  test("filters apply explicitly, persist through refresh and clear to the current month", async ({
    page,
  }) => {
    await page.goto("/reports");
    await expect(page.getByTestId("report-expense")).toBeVisible();
    await page.getByRole("button", { name: "Last 7 Days", exact: true }).click();
    await expect(page).toHaveURL(/\/reports$/);
    await page.getByRole("button", { name: "Apply Filters", exact: true }).click();
    await expect(page).toHaveURL(/period=last_seven_days/);
    await page.reload();
    await expect(page.getByTestId("report-period")).toContainText("7 calendar days");
    await page.getByRole("button", { name: "Clear Filters", exact: true }).click();
    await expect(page).toHaveURL(/period=month/);
  });
  test("custom inclusive dates validate and correctly return an empty historical selection", async ({
    page,
  }) => {
    await page.goto("/reports");
    await page.getByRole("button", { name: "Custom Range", exact: true }).click();
    await page.locator("#report-date_from").fill("2020-02-02");
    await page.locator("#report-date_to").fill("2020-02-01");
    await page.getByRole("button", { name: "Apply Filters", exact: true }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "End date must be on or after start" })
    ).toBeVisible();
    await page.locator("#report-date_from").fill("2020-01-01");
    await page.locator("#report-date_to").fill("2020-01-31");
    await page.getByRole("button", { name: "Apply Filters", exact: true }).click();
    await expect(page.getByTestId("report-count")).toHaveText("0");
    await expect(page.getByText(/No financial activity matches/)).toBeVisible();
  });
  test("unsupported URL filters never render a broader unfiltered report", async ({ page }) => {
    await page.goto("/reports?owner=other");
    await expect(
      page.getByRole("alert").filter({ hasText: "invalid, repeated, or unsupported" })
    ).toBeVisible();
    await expect(page.getByTestId("report-expense")).toHaveCount(0);
    await page.getByRole("button", { name: "Clear Filters", exact: true }).click();
    await expect(page.getByTestId("report-expense")).toBeVisible();
  });
  test("report errors remain visible and recover through real refetch (injected read failure)", async ({
    page,
  }) => {
    await page.route("**/api/v1/reports/summary**", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Simulated report read outage" }),
      })
    );
    await page.goto("/reports");
    await expect(
      page.getByRole("alert").filter({ hasText: "Simulated report read outage" })
    ).toBeVisible();
    await expect(page.getByTestId("report-expense")).toHaveCount(0);
    await page.unroute("**/api/v1/reports/summary**");
    await page.getByRole("button", { name: "Retry loading", exact: true }).click();
    await expect(page.getByTestId("report-expense")).toBeVisible();
  });
  test("CSV downloads the real authenticated UTF-8 backend file once", async ({ page }) => {
    await page.goto("/reports");
    await page.getByRole("button", { name: "Export CSV", exact: true }).click();
    const modal = page.getByRole("dialog");
    await expect(
      modal.getByRole("heading", { name: "Export Transactions (CSV)", exact: true })
    ).toBeVisible();
    const downloads: unknown[] = [];
    page.on("download", (d) => downloads.push(d));
    const downloaded = page.waitForEvent("download");
    await modal.getByRole("button", { name: "Download CSV", exact: true }).dblclick();
    const file = await downloaded;
    expect(file.suggestedFilename()).toBe("kivo-transactions.csv");
    expect(downloads).toHaveLength(1);
    const bytes = await readFile((await file.path())!);
    expect([...bytes.subarray(0, 3)]).toEqual([239, 187, 191]);
    const rows = csvRecords(bytes.toString("utf8"));
    expect(rows.length).toBeGreaterThan(0);
    expect(
      rows.every((row) => ["posted", "reversed", "voided", "reversal"].includes(row.status))
    ).toBe(true);
    expect(rows.every((row) => /^-?\d+\.\d{2}$/.test(row.net_expense_inr))).toBe(true);
    await expect(modal.getByRole("status")).toContainText("Downloaded");
  });
  test("CSV uses actual account/category options and validates inclusive dates", async ({
    page,
  }) => {
    await page.goto("/reports");
    await page.getByRole("button", { name: "Export CSV", exact: true }).click();
    const modal = page.getByRole("dialog");
    await modal.locator("#export-account").selectOption(process.env.KIVO_E2E_ACCOUNT_A!);
    await modal.locator("#export-category").selectOption(process.env.KIVO_E2E_CATEGORY_A!);
    await modal.locator("#export-startDate").fill("2026-11-02");
    await modal.locator("#export-endDate").fill("2026-11-01");
    await modal.getByRole("button", { name: "Download CSV", exact: true }).click();
    await expect(modal.getByText("Start date must not be after end date")).toBeVisible();
  });
  test("fund reports display a pinned actual snapshot and link to lineage", async ({ page }) => {
    await page.goto("/reports");
    await page.getByRole("button", { name: "Fund Attribution Report", exact: true }).click();
    await expect(
      page.getByRole("link", { name: "View Journey", exact: true }).first()
    ).toBeVisible();
    await expect(page.getByText(/Current pinned FIFO snapshot/)).toBeVisible();
  });
  for (const [path, width] of [
    ["/budgets", 375],
    ["/reports", 375],
    ["/reports", 768],
    ["/budgets", 1440],
  ] as const) {
    test(path + " fits " + width + "px without horizontal page overflow", async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      if (path === "/reports") await expect(page.getByTestId("report-expense")).toBeVisible();
      else
        await expect(
          page.getByTestId("budget-card-" + process.env.KIVO_E2E_BUDGET_A)
        ).toBeVisible();
      const dimensions = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 2);
    });
  }
});
