import { test, expect } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { authPost } from "./live-api";

test.use({ storageState: { cookies: [], origins: [] } });

test("real first-time wizard at all six widths without creating a financial account", async ({
  page,
  context,
}) => {
  test.setTimeout(180_000);
  if (process.env.KIVO_ALLOW_DEV_TEST_RECORDS !== "1")
    throw new Error("Approved development test identity opt-in is required.");
  const input = {
    name: `Bug 02 wizard ${randomUUID()}`,
    email: `kivo-bug02-${randomUUID()}@example.test`,
    password: `${randomBytes(24).toString("base64url")}!a7`,
  };
  expect((await authPost(context.request, "/api/v1/auth/register/", input)).status()).toBe(201);
  expect(
    (
      await authPost(context.request, "/api/v1/auth/login/", {
        email: input.email,
        password: input.password,
      })
    ).status()
  ).toBe(200);
  const financialWrites: string[] = [],
    errors: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      /\/api\/v1\/accounts\/?$/.test(new URL(request.url()).pathname)
    )
      financialWrites.push(request.method());
  });
  page.on("pageerror", (error) => errors.push(error.name));
  for (const width of [360, 375, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/onboarding");
    await expect(page.getByRole("heading", { name: "Welcome to Kivo", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Begin Setup" }).click();
    await expect(page.getByLabel("Display Name", { exact: true })).toHaveValue(input.name);
    await expect(page.getByLabel("Display Name", { exact: true })).toHaveAttribute("readonly");
    await page.getByRole("button", { name: "Continue to Account" }).click();
    await page.getByLabel(/Account Name/i).fill("Wizard input only");
    await page.getByLabel(/Opening Balance/i).fill("12.34");
    await page.getByRole("button", { name: "Review Setup" }).click();
    await expect(page.getByRole("heading", { name: "Setup Summary", exact: true })).toBeVisible();
    await expect(page.getByText("₹12.34", { exact: true })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
      )
    ).toBe(true);
    expect(await page.locator("body").innerText()).not.toMatch(
      /Django|Integer Paise|Phase [1-7]|backend|ledger|API/i
    );
  }
  expect(financialWrites).toEqual([]);
  expect(errors).toEqual([]);
  expect((await authPost(context.request, "/api/v1/auth/logout/", {})).status()).toBe(204);
  await page.goto("/");
  await expect(page).toHaveURL(/\/register$/);
});
