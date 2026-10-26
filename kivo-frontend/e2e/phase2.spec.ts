import { test, expect } from "@playwright/test";

test.describe("Authentication/profile UI with a real Django session", () => {
  test("renders login controls and validates empty input", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/login");
    await expect(page).toHaveTitle(/Sign In — Kivo/i);
    await page.getByRole("button", { name: /Sign In/i }).click();
    await expect(page.getByText("Email address is required")).toBeVisible();
    await expect(page.getByText("Password is required")).toBeVisible();
    await page.getByRole("button", { name: /Show password/i }).click();
    await expect(page.getByLabel(/^Password/i)).toHaveAttribute("type", "text");
  });
  test("uses verified password requirements and validates confirmation", async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await page.goto("/register");
    await expect(page.getByText("At least 10 characters")).toBeVisible();
    await expect(page.getByText("Not entirely numeric")).toBeVisible();
    await page.getByLabel(/Full name/i).fill("Integration form validation");
    await page.getByLabel(/Email address/i).fill("input-only@example.test");
    await page.getByLabel(/^Password/i).fill("FormValidation123!");
    await page.getByLabel(/Confirm password/i).fill("MismatchValidation123!");
    await page.getByRole("button", { name: /Create Account/i }).click();
    await expect(page.getByText("Passwords do not match")).toBeVisible();
  });
  test("restores the authenticated profile after refresh and disables unsupported operations", async ({
    page,
  }) => {
    await page.goto("/settings/profile");
    await expect(
      page.getByRole("heading", { name: process.env.KIVO_E2E_NAME_A!, exact: true })
    ).toBeVisible();
    await expect(page.getByLabel(/Email Address/i)).toHaveValue(process.env.KIVO_E2E_EMAIL_A!);
    await page.reload();
    await expect(page.getByLabel(/Email Address/i)).toHaveValue(process.env.KIVO_E2E_EMAIL_A!);
    await expect(page.getByRole("button", { name: /Update Profile Details/i })).toBeDisabled();
    await expect(page.getByRole("button", { name: /Change Password/i })).toBeDisabled();
  });
  test("redirects a returning user away from onboarding", async ({ page }) => {
    const accountCheck = page.waitForResponse(
      (response) => /\/api\/v1\/accounts\/?$/.test(response.url()) && response.status() !== 308
    );
    await page.goto("/onboarding");
    expect((await accountCheck).status()).toBe(200);
    await expect(page).toHaveURL(/\/dashboard$/);
  });
  for (const viewport of [
    { width: 375, height: 667 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    for (const route of ["/login", "/register", "/settings/profile"]) {
      test(`renders ${route} without overflow at ${viewport.width}px`, async ({
        page,
        context,
      }) => {
        if (route !== "/settings/profile") await context.clearCookies();
        await page.setViewportSize(viewport);
        await page.goto(route);
        if (route === "/settings/profile")
          await expect(page.getByText("Connected", { exact: true })).toBeVisible();
        const fits = await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
        );
        expect(fits).toBe(true);
      });
    }
  }
});
