import { test, expect, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const routes = [
  ["Money Accounts", "/money", "Money Accounts"],
  ["Transactions", "/transactions", "Transaction Activity"],
  ["Funds & Attribution", "/money/sources", "Money Sources & Fund Journey"],
  ["People & Friends", "/people", "Friends & Contacts"],
  ["Rent & Reserves", "/rent", "Monthly Rent & Reserves"],
  ["Budgets", "/budgets", "Budget Management"],
  ["Reports & Analytics", "/reports", "Financial Analytics & Reports"],
] as const;

type Metrics = Window & {
  uiShift?: number;
  uiFeedback?: number;
  uiObserver?: MutationObserver;
  uiHeader?: Element | null;
};
async function loaded(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 20_000 });
  await expect
    .poll(async () => {
      const texts = await page.getByRole("status").allTextContents();
      return texts.filter((text) => /Loading|Checking your/i.test(text)).length;
    })
    .toBe(0);
  await page.waitForTimeout(300);
}

test("production navigation and interaction measurements", async ({ page, context }) => {
  test.setTimeout(300_000);
  const auth = await context.request.get("/api/v1/auth/me/");
  expect(
    auth.status(),
    "Existing approved test session must be valid; no fixture writes are performed"
  ).toBe(200);
  await page.addInitScript(() => {
    (window as Metrics).uiShift = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const value = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
        if (!value.hadRecentInput) (window as Metrics).uiShift! += value.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  const requests: { path: string; ms: number; status: number }[] = [];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.name));
  page.on("response", async (response) => {
    const url = new URL(response.url());
    if (!url.pathname.startsWith("/api/v1/") || response.status() === 308) return;
    await response.finished();
    const time = response.request().timing();
    requests.push({
      path: url.pathname + url.search,
      ms: time.responseEnd,
      status: response.status(),
    });
  });
  const measurements: object[] = [];
  const stage = process.env.KIVO_UI_STAGE === "before" ? "before" : "after";
  for (let round = 1; round <= 2; round++) {
    for (const [label, path, heading] of routes) {
      await page.goto("/dashboard");
      await expect(page.getByTestId("dashboard-metrics")).toBeVisible();
      await loaded(page);
      const navWidth = await page
        .getByRole("navigation", { name: "Application navigation" })
        .first()
        .evaluate((el) => ({ client: el.clientWidth, scroll: el.scrollWidth }));
      await page.evaluate(
        ({ target, title }) => {
          const state = window as Metrics;
          state.uiFeedback = undefined;
          state.uiHeader = document.querySelector("header");
          state.uiObserver?.disconnect();
          const start = performance.now();
          state.uiObserver = new MutationObserver(() => {
            const pending = document.querySelector('[data-navigation-pending="true"]');
            const active = [...document.querySelectorAll('a[aria-current="page"]')].some(
              (el) => el.getAttribute("href") === target
            );
            const arrived =
              location.pathname === target &&
              [...document.querySelectorAll("h1,h2")].some(
                (el) => el.textContent?.trim() === title
              );
            if (pending || active || arrived) {
              state.uiFeedback = performance.now() - start;
              state.uiObserver?.disconnect();
            }
          });
          state.uiObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
          });
        },
        { target: path, title: heading }
      );
      const start = Date.now(),
        requestStart = requests.length;
      await page
        .getByRole("navigation", { name: "Application navigation" })
        .first()
        .getByRole("link", { name: label, exact: true })
        .click();
      await expect(page).toHaveURL((url) => url.pathname === path);
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
      const headingMs = Date.now() - start;
      await loaded(page);
      const api = requests.slice(requestStart);
      measurements.push({
        round,
        path,
        header_preserved: await page.evaluate(
          () => (window as Metrics).uiHeader === document.querySelector("header")
        ),
        heading_ms: headingMs,
        settled_ms: Date.now() - start,
        feedback_ms: await page.evaluate(() => (window as Metrics).uiFeedback ?? null),
        nav_width: navWidth,
        requests: api,
        identical_get_counts: Object.fromEntries(
          [...new Set(api.map((r) => r.path))].map((p) => [
            p,
            api.filter((r) => r.path === p).length,
          ])
        ),
        cls: await page.evaluate(() => (window as Metrics).uiShift ?? 0),
      });
      await writeFile(
        `.playwright-auth/bug02-${stage}-metrics.json`,
        JSON.stringify(
          { measurements, completed: false, requests, recorded_at: new Date().toISOString() },
          null,
          2
        ),
        { mode: 0o600 }
      );
    }
  }
  await page.goto("/dashboard");
  await expect(page.getByTestId("dashboard-metrics")).toBeVisible();
  await loaded(page);
  const dialogStart = Date.now();
  await page.getByRole("button", { name: "Quick Add", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const dialogMs = Date.now() - dialogStart;
  await page.keyboard.press("Escape");
  await mkdir(".playwright-auth", { recursive: true, mode: 0o700 });
  await writeFile(
    `.playwright-auth/bug02-${stage}-metrics.json`,
    JSON.stringify(
      {
        measurements,
        completed: true,
        dialog_ms: dialogMs,
        runtime_errors: errors,
        requests,
        recorded_at: new Date().toISOString(),
      },
      null,
      2
    ),
    { mode: 0o600 }
  );
  expect(errors).toEqual([]);
  expect(requests.filter((r) => r.status >= 500)).toEqual([]);
});
