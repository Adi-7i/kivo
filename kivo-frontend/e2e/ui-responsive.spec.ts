import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const widths = [360, 375, 768, 1024, 1280, 1440];
const jargon =
  /Django|PostgreSQL|Supabase|Phase [1-7]|Authoritative|Integer Paise|API Transport Ready|Foundation Preview|backend-supported|Output Schema/i;
const routes = [
  "/dashboard",
  "/money",
  "/transactions",
  "/money/sources",
  "/people",
  "/shared-expenses",
  "/rent",
  "/budgets",
  "/reports",
  "/settings/categories",
  "/settings/profile",
];
const detailRoutes: string[] = [];
let failures: string[] = [];
const layoutMeasurements: object[] = [];
let initialShift = 0;
test.beforeEach(async ({ page }) => {
  failures = [];
  initialShift = 0;
  await page.addInitScript(() => {
    const state = window as Window & { uiLayoutShift?: number };
    state.uiLayoutShift = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
        if (!shift.hadRecentInput) state.uiLayoutShift! += shift.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  page.on("request", (request) => {
    if (
      new URL(request.url()).pathname.startsWith("/api/v1/") &&
      !["GET", "HEAD"].includes(request.method())
    )
      failures.push("Unexpected mutation in read-only layout suite");
  });
  page.on("pageerror", (error) => failures.push(error.name));
  page.on("response", (response) => {
    if (response.status() >= 500)
      failures.push(`HTTP ${response.status()} ${new URL(response.url()).pathname}`);
  });
});
test.afterEach(async ({ page }, info) => {
  layoutMeasurements.push({
    title: info.title,
    last_viewport_width: page.viewportSize()?.width,
    initial_load_layout_shift: initialShift,
    evidence: info.project.name || "live-django",
  });
  await writeFile(
    ".playwright-auth/bug02-layout-measurements.json",
    JSON.stringify(layoutMeasurements, null, 2),
    { mode: 0o600 }
  );
  expect(failures).toEqual([]);
});

async function loadDetailRoutes(request: APIRequestContext) {
  if (detailRoutes.length) return;
  expect((await request.get("/api/v1/auth/me/")).status()).toBe(200);
  for (const [endpoint, route] of [
    ["accounts", "money"],
    ["transactions", "transactions"],
    ["funds/batches", "money/sources"],
    ["contacts", "people"],
    ["shared-bills", "shared-expenses"],
  ]) {
    const response = await request.get(`/api/v1/${endpoint}/`);
    expect(response.status()).toBe(200);
    const first = (await response.json()).results[0];
    expect(first?.id, `Existing read-only ${endpoint} detail fixture is required`).toBeTruthy();
    detailRoutes.push(`/${route}/${first.id}`);
  }
}

async function stable(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 25_000 });
  await expect(page.getByTestId("page-content")).toBeVisible();
  // Recharts and informational profile notices legitimately use role=alert.
  // Require absence of actual recovery/error controls; also assert real HTTP/runtime failures below.
  await expect(
    page.getByRole("button", {
      name: /Retry loading|Retry session check|Retry account check|Try Again/i,
    })
  ).toHaveCount(0);
  initialShift = await page.evaluate(
    () => (window as Window & { uiLayoutShift?: number }).uiLayoutShift ?? 0
  );
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(jargon);
}
async function fits(page: Page) {
  const geometry = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
    overflow: [...document.querySelectorAll("body *")]
      .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
      .slice(0, 12)
      .map((el) => ({
        tag: el.tagName,
        class: el.getAttribute("class"),
        right: el.getBoundingClientRect().right,
        width: el.getBoundingClientRect().width,
        overflow: getComputedStyle(el).overflowX,
      })),
  }));
  expect(geometry.scroll, JSON.stringify(geometry.overflow)).toBeLessThanOrEqual(
    geometry.viewport + 1
  );
}
async function viewports(page: Page, name: string) {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(100);
    await fits(page);
    if (width >= 1024) {
      const nav = page.getByRole("navigation", { name: "Application navigation" });
      await expect(nav).toBeVisible();
      const size = await nav.evaluate((el) => ({ width: el.clientWidth, scroll: el.scrollWidth }));
      expect(size.scroll).toBeLessThanOrEqual(size.width + 1);
      await expect(
        page.getByRole("button", { name: "Collapse sidebar", exact: true })
      ).toBeVisible();
    } else {
      await page.getByRole("button", { name: "Open navigation", exact: true }).click();
      const drawer = page.getByRole("dialog", { name: "Navigation" });
      await expect(drawer).toBeVisible();
      await expect(drawer.getByRole("navigation")).toBeVisible();
      await expect(
        drawer.getByRole("link", { name: "Reports & Analytics", exact: true })
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(drawer).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Open navigation", exact: true })
      ).toBeFocused();
    }
    if (name === "/dashboard" && [375, 1440].includes(width)) {
      await mkdir(".playwright-auth", { recursive: true, mode: 0o700 });
      await page.screenshot({
        path: `.playwright-auth/bug02-overview-${width}.png`,
        fullPage: true,
      });
    }
  }
}

for (const route of routes) {
  test(`responsive page ${route}`, async ({ page }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.name));
    await page.goto(route);
    await stable(page);
    await viewports(page, route);
    expect(errors).toEqual([]);
  });
}

for (let index = 0; index < 5; index++) {
  test(`responsive detail ${index + 1}`, async ({ page, request }) => {
    await loadDetailRoutes(request);
    await page.goto(detailRoutes[index]);
    await stable(page);
    await viewports(page, detailRoutes[index]);
  });
}

const dialogs = [
  ["/dashboard", "Quick Add", "Quick Add Transaction"],
  ["/money", "Add Account", "Add Money Account"],
  ["/people", "Add Contact", "Add Personal Contact"],
  ["/people", "Lend", "Lend Money to Friend"],
  ["/shared-expenses", "Create Shared Bill", "Create Shared Bill"],
  ["/rent", "Create Rent Plan", "Create Monthly Rent Plan"],
  ["/rent", "New Reserve", "Create Rent Reserve Earmark"],
  ["/budgets", "Set Monthly Budget", "Create Budget Plan"],
  ["/reports", "Export CSV", "Export Transactions (CSV)"],
  ["/settings/categories", "Add Category", "New Category"],
] as const;
for (const [route, button, title] of dialogs) {
  test(`responsive form ${route} ${button}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(route);
    await stable(page);
    await page.getByRole("button", { name: button, exact: true }).first().click();
    const dialog = page
      .getByRole("dialog")
      .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
    await expect(dialog).toBeVisible();
    for (const width of widths) {
      await page.setViewportSize({ width, height: 740 });
      await page.waitForTimeout(100);
      await expect(dialog).toBeVisible();
      const box = await dialog.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
      expect(box!.y + box!.height).toBeLessThanOrEqual(741);
      await fits(page);
      expect(await dialog.innerText()).not.toMatch(jargon);
      await page.keyboard.press("Tab");
      expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(
        true
      );
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  });
}

test("sidebar collapse, active links, focus trap and reduced motion", async ({ page }) => {
  await page.goto("/dashboard");
  await stable(page);
  await expect(page.getByRole("link", { name: "Dashboard", exact: true })).toHaveAttribute(
    "aria-current",
    "page"
  );
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await page.getByRole("link", { name: "Money Accounts", exact: true }).click();
  await expect(page).toHaveURL(/\/money$/);
  await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeVisible();
  await page.getByRole("button", { name: "Expand sidebar" }).click();
  await page.setViewportSize({ width: 375, height: 740 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  const drawer = page.getByRole("dialog", { name: "Navigation" });
  for (let i = 0; i < 16; i++) await page.keyboard.press("Tab");
  expect(await drawer.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  await drawer.getByRole("link", { name: "Transactions", exact: true }).click();
  await expect(drawer).toHaveCount(0);
  await expect(page).toHaveURL(/\/transactions$/);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const motion = await page.evaluate(() => {
    const element = document.createElement("div");
    element.className = "animate-pulse";
    document.body.appendChild(element);
    const duration = getComputedStyle(element).animationDuration;
    element.remove();
    return duration;
  });
  expect(parseFloat(motion)).toBeLessThanOrEqual(0.001);
});

test.describe("anonymous authentication layout", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  for (const route of ["/login", "/register"]) {
    test(`responsive public ${route}`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator("form:visible")).toBeVisible();
      for (const width of widths) {
        await page.setViewportSize({ width, height: 740 });
        await fits(page);
        expect(await page.locator("body").innerText()).not.toMatch(jargon);
        const form = page.locator("form:visible");
        const box = await form.boundingBox();
        expect(box!.width).toBeGreaterThan(250);
        await expect(form.getByLabel(/Email address/i)).toBeVisible();
      }
    });
  }
});
