import { test, expect } from "@playwright/test";
import { authPost, backendOrigin, csrf, frontendOrigin } from "./live-api";

test.use({ storageState: { cookies: [], origins: [] } });

test("real Django registration, sessions, opening account, CSRF, isolation and logout", async ({
  page,
  context,
}) => {
  test.setTimeout(360_000);
  const email = process.env.KIVO_E2E_EMAIL_B!;
  const password = process.env.KIVO_E2E_PASSWORD!;
  const name = `Kivo Integration B ${process.env.KIVO_E2E_RUN}`;

  await test.step("anonymous protected request", () => page.goto("/dashboard"));
  await expect(page).toHaveURL(/\/login\?next=/);
  await test.step("open registration", () => page.goto("/register"));
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
  await page.getByRole("button", { name: /Create Account/i }).click();
  await expect(page).toHaveURL(`${frontendOrigin}/login`, { timeout: 30_000 });
  console.log("Real integration: registration confirmed; checking duplicate handling.");
  expect((await context.request.get(`${frontendOrigin}/api/v1/auth/me/`)).status()).toBe(401);

  const duplicate = await authPost(context.request, "/api/v1/auth/register/", {
    name,
    email,
    password,
  });
  expect(duplicate.status()).toBe(400);
  expect((await duplicate.json()).error.details.email).toBeTruthy();
  const invalid = await authPost(context.request, "/api/v1/auth/login/", {
    email,
    password: "DefinitelyWrongPassword1!",
  });
  expect(invalid.status()).toBe(400);

  await expect(page).toHaveURL(`${frontendOrigin}/login`);
  await page
    .locator("form:visible")
    .getByLabel(/Email address/i)
    .fill(email);
  await page
    .locator("form:visible")
    .getByLabel(/^Password/i)
    .fill(password);
  const oldCsrf = (await context.cookies()).find((cookie) => cookie.name === "csrftoken")?.value;
  await page.getByRole("button", { name: /Sign In/i }).click();
  await expect(page).toHaveURL(/\/onboarding$/, { timeout: 30_000 });
  console.log("Real integration: login confirmed; completing initial account setup.");
  const cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === "sessionid")?.httpOnly).toBe(true);
  expect(cookies.find((cookie) => cookie.name === "sessionid")?.sameSite).toBe("Lax");
  expect(cookies.find((cookie) => cookie.name === "csrftoken")?.value).not.toBe(oldCsrf);

  await expect(page.getByRole("heading", { name: "Welcome to Kivo" })).toBeVisible();
  await page.getByRole("button", { name: /Begin Setup/i }).click();
  await expect(page.locator("form:visible").getByLabel(/Display Name/i)).toHaveValue(name);
  await page.getByRole("button", { name: /Continue to Account/i }).click();
  await page
    .locator("form:visible")
    .getByLabel(/Account Name/i)
    .fill(`Integration opening ${process.env.KIVO_E2E_RUN}`);
  await page
    .locator("form:visible")
    .getByLabel(/Opening Balance/i)
    .fill("1200.50");
  await page.getByRole("button", { name: /Review Setup/i }).click();
  await expect(page.getByText("₹1,200.50")).toBeVisible();
  const creationRequest = page.waitForRequest(
    (request) => request.method() === "POST" && /\/api\/v1\/accounts\/?$/.test(request.url())
  );
  await page.getByRole("button", { name: /Complete Setup/i }).dblclick();
  const posted = await creationRequest;
  const originalKey = posted.headers()["idempotency-key"];
  const originalBody = posted.postDataJSON();
  expect(originalBody.opening_balance).toBe("1200.50");
  expect(typeof originalKey).toBe("string");
  await expect
    .poll(
      async () => {
        if (/\/dashboard$/.test(page.url())) return true;
        const check = page.getByRole("button", { name: "Check account status" });
        if ((await check.isVisible()) && (await check.isEnabled())) await check.click();
        return /\/dashboard$/.test(page.url());
      },
      { timeout: 30_000 }
    )
    .toBe(true);
  console.log("Real integration: opening account confirmed; checking replay, CSRF and isolation.");
  const accounts = await (await context.request.get(`${frontendOrigin}/api/v1/accounts/`)).json();
  expect(accounts.count).toBe(1);
  expect(accounts.results[0]).toMatchObject({ balance: "1200.50", opening_balance: "1200.50" });

  const replay = await context.request.post(`${frontendOrigin}/api/v1/accounts/`, {
    data: originalBody,
    headers: {
      Origin: frontendOrigin,
      "X-CSRFToken": await csrf(context.request),
      "Idempotency-Key": originalKey,
    },
  });
  expect(replay.status()).toBe(200);
  expect((await replay.json()).id).toBe(accounts.results[0].id);
  const conflict = await context.request.post(`${frontendOrigin}/api/v1/accounts/`, {
    data: { ...originalBody, opening_balance: "1.00" },
    headers: {
      Origin: frontendOrigin,
      "X-CSRFToken": await csrf(context.request),
      "Idempotency-Key": originalKey,
    },
  });
  expect(conflict.status()).toBe(409);

  const cookieHeader = (await context.cookies())
    .filter((cookie) => ["sessionid", "csrftoken"].includes(cookie.name))
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
  const summary = await context.request.get(`${backendOrigin}/api/v1/accounts/summary/`, {
    headers: { Cookie: cookieHeader },
  });
  expect(summary.status()).toBe(200);
  expect(await summary.json()).toEqual({
    liquid_balance: "1200.50",
    personal_expense: "0.00",
    external_receipts: "0.00",
  });
  const foreign = await context.request.get(
    `${backendOrigin}/api/v1/accounts/${process.env.KIVO_E2E_ACCOUNT_A}/`,
    { headers: { Cookie: cookieHeader } }
  );
  expect(foreign.status()).toBe(404);
  const missingCsrf = await context.request.post(`${frontendOrigin}/api/v1/accounts/`, {
    data: originalBody,
    headers: { Origin: frontendOrigin, "Idempotency-Key": "must-not-write" },
  });
  expect(missingCsrf.status()).toBe(403);
  const crossOrigin = await context.request.post(`${frontendOrigin}/api/v1/accounts/`, {
    data: originalBody,
    headers: { Origin: "https://untrusted.example", "X-CSRFToken": await csrf(context.request) },
  });
  expect(crossOrigin.status()).toBe(403);

  await page.goto("/settings/profile");
  await expect(page.getByLabel(/Email Address/i)).toHaveValue(email);
  await page.reload();
  await expect(page.getByLabel(/Email Address/i)).toHaveValue(email);
  const returningAccountCheck = page.waitForResponse(
    (response) => /\/api\/v1\/accounts\/?$/.test(response.url()) && response.status() !== 308
  );
  await page.goto("/onboarding");
  expect((await returningAccountCheck).status()).toBe(200);
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  console.log("Real integration: logout requested; checking invalidation and user switching.");
  await expect(page).toHaveURL(/\/login$/);
  expect((await context.request.get(`${frontendOrigin}/api/v1/auth/me/`)).status()).toBe(401);
  expect(
    (
      await context.request.get(`${frontendOrigin}/api/v1/auth/me/`, {
        headers: { Cookie: cookieHeader },
      })
    ).status()
  ).toBe(401);

  await page
    .locator("form:visible")
    .getByLabel(/Email address/i)
    .fill(process.env.KIVO_E2E_EMAIL_A!);
  await page
    .locator("form:visible")
    .getByLabel(/^Password/i)
    .fill(password);
  await page.getByRole("button", { name: /Sign In/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 });
  await page.goto("/settings/profile");
  await expect(page.getByLabel(/Email Address/i)).toHaveValue(process.env.KIVO_E2E_EMAIL_A!);
  await expect(page.getByText(name, { exact: true })).toHaveCount(0);
  await context.addCookies([
    {
      name: "sessionid",
      value: "expired-or-invalid-test-session",
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await page.goto("/settings/profile");
  await expect(page).toHaveURL(/\/login\?next=/);

  const weakPassword = await authPost(context.request, "/api/v1/auth/register/", {
    name: "Integration invalid password",
    email: `kivo-integration-${process.env.KIVO_E2E_RUN}-weak@example.test`,
    password: "123",
  });
  expect(weakPassword.status()).toBe(400);
  expect((await weakPassword.json()).error.details.password).toBeTruthy();
});
