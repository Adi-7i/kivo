import { test, expect } from "@playwright/test";

test.describe("Frontend Phase 1 Foundation E2E", () => {
  test("loads the foundation preview page at /", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);

    // Verify title and main heading
    await expect(page).toHaveTitle(/Kivo/);
    await expect(page.getByRole("heading", { name: "Kivo Global Design System" })).toBeVisible();
  });

  test("renders the brand header and status indicators", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Phase 1 Foundation")).toBeVisible();
    await expect(page.getByText("API Transport Ready")).toBeVisible();
  });

  test("renders design system primitives with proper interactive states", async ({ page }) => {
    await page.goto("/");

    // Primary button should be visible and focusable
    const primaryBtn = page.getByRole("button", { name: "Primary", exact: true });
    await expect(primaryBtn).toBeVisible();
    await primaryBtn.focus();
    await expect(primaryBtn).toBeFocused();

    // Disabled button should not be clickable
    const disabledBtn = page.getByRole("button", { name: "Disabled", exact: true });
    await expect(disabledBtn).toBeDisabled();
  });

  test("displays integer-paise INR formatting preview without floating point artifacts", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByText("₹12,345.67")).toBeVisible();
    await expect(page.getByText("+₹50,000.00")).toBeVisible();
    await expect(page.getByText("-₹1,845.50")).toBeVisible();
  });

  test("renders responsive layout without horizontal overflow", async ({ page }) => {
    await page.goto("/");

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
