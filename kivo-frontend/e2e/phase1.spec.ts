import { test, expect } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Application entry with real anonymous Django verification", () => {
  test("opens registration from the root without any design-system showcase", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/register$/);
    await expect(
      page.getByRole("heading", { name: "Create your account", exact: true })
    ).toBeVisible();
    await expect(
      page.getByText(/Phase 1 Foundation|Kivo Global Design System|API Transport Ready/)
    ).toHaveCount(0);
  });

  test("offers login and registration navigation with no private application menu", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("button", { name: "Sign In", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Create an account", exact: true }).click();
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByRole("navigation", { name: "Application navigation" })).toHaveCount(0);
  });

  test("renders the registration entry without horizontal overflow", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Create Account", exact: true })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
      )
    ).toBe(true);
  });
});
