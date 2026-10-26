import { test, expect } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { frontendOrigin, posted } from "./live-api";

/** One real isolated development identity; no global financial fixture or cleanup writes. */
test("real Django fresh entry, registration, setup, dashboard restoration and logout", async ({
  page,
  context,
}) => {
  test.setTimeout(360_000);
  if (process.env.KIVO_ALLOW_DEV_TEST_RECORDS !== "1")
    throw new Error("This live journey requires the approved development test-record opt-in.");
  const run = randomUUID();
  const email = `kivo-bug01-${run}@example.test`;
  const password = `${randomBytes(24).toString("base64url")}!a7`;
  const name = `Bug 01 development ${run}`;
  const accountName = `Bug 01 opening ${run}`;
  const unexpected: string[] = [];
  let injectingAccountFailure = false;
  page.on("pageerror", (error) => unexpected.push(error.name));
  page.on("response", (response) => {
    if (
      response.status() >= 500 &&
      !(
        injectingAccountFailure &&
        response.status() === 503 &&
        /^\/api\/v1\/accounts\/?$/.test(new URL(response.url()).pathname)
      )
    )
      unexpected.push(`HTTP ${response.status()} ${new URL(response.url()).pathname}`);
  });

  await page.goto("/");
  await expect(page).toHaveURL(/\/register$/);
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole("link", { name: "Create an account", exact: true }).click();
  await page
    .locator("form:visible")
    .getByLabel(/Full name/i)
    .fill(name);
  await page
    .locator("form:visible")
    .getByLabel(/Email address/i)
    .fill(email);
  await page
    .locator("form:visible")
    .getByLabel(/^Password/i)
    .fill(password);
  await page
    .locator("form:visible")
    .getByLabel(/Confirm password/i)
    .fill(password);
  const registered = page.waitForResponse((response) => posted(response, "/api/v1/auth/register/"));
  await page.getByRole("button", { name: "Create Account", exact: true }).click();
  expect((await registered).status()).toBe(201);
  await expect(page).toHaveURL(/\/login$/);
  expect((await context.request.get(`${frontendOrigin}/api/v1/auth/me/`)).status()).toBe(401);
  await page
    .locator("form:visible")
    .getByLabel(/Email address/i)
    .fill(email);
  await page
    .locator("form:visible")
    .getByLabel(/^Password/i)
    .fill(password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Welcome to Kivo" })).toBeVisible();
  const session = (await context.cookies()).find((cookie) => cookie.name === "sessionid");
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Lax");
  for (const route of ["/", "/login", "/register", "/dashboard"]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.getByRole("heading", { name: "Welcome to Kivo" })).toBeVisible();
    await expect(page.getByTestId("dashboard-metrics")).toHaveCount(0);
  }
  await page.getByRole("button", { name: /Begin Setup/i }).click();
  await expect(page.locator("form:visible").getByLabel(/Display Name/i)).toHaveValue(name);
  await expect(page.locator("form:visible").getByLabel(/Display Name/i)).toHaveAttribute(
    "readonly"
  );
  await expect(page.getByText(/Asia\/Kolkata \(IST/)).toBeVisible();
  await page.getByRole("button", { name: /Continue to Account/i }).click();
  await page
    .locator("form:visible")
    .getByLabel(/Account Name/i)
    .fill(accountName);
  await page
    .locator("form:visible")
    .getByLabel(/Opening Balance/i)
    .fill("5.25");
  await page.getByRole("button", { name: /Review Setup/i }).click();
  await expect(page.getByText("₹5.25")).toBeVisible();
  const creation = page.waitForResponse((response) => posted(response, "/api/v1/accounts/"));
  let creates = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && /\/api\/v1\/accounts$/.test(new URL(request.url()).pathname))
      creates++;
  });
  await page.getByRole("button", { name: /Complete Setup/i }).dblclick();
  const created = await creation;
  expect(created.status()).toBe(201);
  // Next canonicalizes the trailing slash; inspect the original browser request.
  let accountRequest = created.request();
  while (accountRequest.redirectedFrom()) accountRequest = accountRequest.redirectedFrom()!;
  expect((await accountRequest.allHeaders())["idempotency-key"]).toBeTruthy();
  const account = await created.json();
  expect(account).toMatchObject({ name: accountName, balance: "5.25", opening_balance: "5.25" });
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 });
  await expect(page.getByTestId("dashboard-metrics")).toBeVisible();
  await expect(page.getByText(accountName, { exact: true })).toBeVisible();
  expect(creates).toBe(1);
  const snapshot = await context.request.get(`${frontendOrigin}/api/v1/dashboard/?period=month`);
  expect(snapshot.status()).toBe(200);
  const data = await snapshot.json();
  expect(data).toMatchObject({
    liquid_balance: "5.25",
    safe_to_spend: "5.25",
    selected_period: { external_income: "0.00" },
    spending: { today: "0.00", month: "0.00" },
  });
  const metric = page.getByTestId("dashboard-metrics");
  await expect(metric).toContainText("₹5.25");
  await expect(
    page.getByText(
      /Phase 1 Foundation|Kivo Global Design System|API Transport Ready|scheduled for Part 5/
    )
  ).toHaveCount(0);
  for (const route of ["/", "/login", "/register", "/onboarding"]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(metric).toBeVisible();
  }
  await page.reload();
  await expect(metric).toBeVisible();
  await expect(page.getByText(accountName, { exact: true })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Application navigation" });
  for (const label of [
    "Money Accounts",
    "Transactions",
    "Funds & Attribution",
    "People & Friends",
    "Rent & Reserves",
    "Budgets",
    "Reports & Analytics",
    "Profile",
  ])
    await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();

  // Inject only this read outage; retry must retain the real verified Django identity.
  injectingAccountFailure = true;
  await page.route(/\/api\/v1\/accounts\/?$/, (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: "{}" })
  );
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Retry account check" })).toBeVisible();
  await expect(page).toHaveURL(`${frontendOrigin}/`);
  expect((await context.cookies()).find((cookie) => cookie.name === "sessionid")?.value).toBe(
    session?.value
  );
  await page.unroute(/\/api\/v1\/accounts\/?$/);
  await page.getByRole("button", { name: "Retry account check" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(metric).toBeVisible();
  injectingAccountFailure = false;
  expect(unexpected).toEqual([]);

  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await context.request.get(`${frontendOrigin}/api/v1/auth/me/`)).status()).toBe(401);
  await page.goBack();
  await expect(page.getByRole("button", { name: "Sign In", exact: true })).toBeVisible();
  await expect(metric).toHaveCount(0);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=/);
  await context.addCookies([
    {
      name: "sessionid",
      value: "expired-bug01-development-session",
      domain: "localhost",
      path: "/",
      httpOnly: true,
    },
  ]);
  await page.goto("/");
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByRole("button", { name: "Create Account", exact: true })).toBeVisible();
  expect(unexpected).toEqual([]);
});
