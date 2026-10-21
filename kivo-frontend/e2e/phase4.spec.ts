import { test, expect } from "@playwright/test";

test.describe("Frontend Phase 4 — Money Sources & Fund Journey Tracking E2E", () => {
  test.describe("Money Sources Overview (/money/sources)", () => {
    test("loads money sources page, renders aggregate overview cards and sub-navigation", async ({
      page,
    }) => {
      const response = await page.goto("/money/sources");
      expect(response?.status()).toBe(200);

      // Page Title & Header
      await expect(page).toHaveTitle(/Kivo/i);
      await expect(
        page.getByRole("heading", { name: "Money Sources & Fund Journey" })
      ).toBeVisible();

      // Sub-navigation between Accounts and Sources
      await expect(page.getByRole("link", { name: /Money Accounts/i })).toBeVisible();
      await expect(page.getByRole("link", { name: /Money Sources & Journeys/i })).toBeVisible();

      // 4 Aggregate Financial Overview Cards
      await expect(page.getByText("Total Inflow Batches")).toBeVisible();
      await expect(page.getByText("Attributed Personal Spent")).toBeVisible();
      await expect(page.getByText("Attributed Lent (Asset)")).toBeVisible();
      await expect(page.getByText("Remaining Liquid Allocation")).toBeVisible();

      // Sources List rows/cards
      await expect(
        page.getByText("October Allowance from Parents").filter({ visible: true }).first()
      ).toBeVisible();
      await expect(
        page.getByText("September Freelance Design Retainer").filter({ visible: true }).first()
      ).toBeVisible();
    });

    test("filters sources by search keyword and resets filters", async ({ page }) => {
      await page.goto("/money/sources");

      const searchInput = page.getByPlaceholder(/Search source name, person, notes/i);
      await expect(searchInput).toBeVisible();

      // Filter by "Freelance"
      await searchInput.fill("Freelance");
      await expect(
        page.getByText("September Freelance Design Retainer").filter({ visible: true }).first()
      ).toBeVisible();
      await expect(
        page.getByText("October Allowance from Parents").filter({ visible: true })
      ).not.toBeVisible();

      // Reset filters
      await page.getByRole("button", { name: /Reset/i }).click();
      await expect(
        page.getByText("October Allowance from Parents").filter({ visible: true }).first()
      ).toBeVisible();
    });

    test("filters sources by status pill", async ({ page }) => {
      await page.goto("/money/sources");

      // Click Exhausted status pill
      await page.getByRole("button", { name: "Exhausted" }).click();
      await expect(
        page.getByText("September Freelance Design Retainer").filter({ visible: true }).first()
      ).toBeVisible();
      await expect(
        page.getByText("October Allowance from Parents").filter({ visible: true })
      ).not.toBeVisible();
    });

    test("switches between view states (Empty State and Skeletons)", async ({ page }) => {
      await page.goto("/money/sources");

      // Switch to Empty State
      await page.getByRole("button", { name: /Empty State/i }).click();
      await expect(page.getByText("No Money Sources Recorded")).toBeVisible();

      // Switch to Loading Skeletons
      await page.getByRole("button", { name: /Loading Skeletons/i }).click();
      await expect(page.getByText("No Money Sources Recorded")).not.toBeVisible();
    });
  });

  test.describe("Fund Detail & Journey (/money/sources/[id])", () => {
    test("loads active source detail and renders overview, timeline, and allocation composition", async ({
      page,
    }) => {
      await page.goto("/money/sources/src-1");

      // Back Link
      await expect(page.getByRole("link", { name: /Back to Money Sources/i })).toBeVisible();

      // Overview Card
      await expect(
        page.getByRole("heading", { name: "October Allowance from Parents" })
      ).toBeVisible();
      await expect(page.getByText("Original Inflow Amount")).toBeVisible();
      await expect(page.getByText("Personal Expenses", { exact: true }).first()).toBeVisible();
      await expect(page.getByText("Lent to Friends (Asset)")).toBeVisible();
      await expect(page.getByText("Remaining Liquid Allocation")).toBeVisible();

      // Financial Accounting Invariant Notice
      await expect(page.getByText(/Spending ≠ Lending ≠ Remaining Funds/i)).toBeVisible();

      // Timeline events
      await expect(page.getByText("Visual Fund Journey")).toBeVisible();
      await expect(page.getByText("Funds Inflow Established")).toBeVisible();
      await expect(page.getByText("House Rent & Maintenance")).toBeVisible();
      await expect(page.getByText("Emergency Loan to Friend")).toBeVisible();

      // Filter timeline events by Lending
      await page.getByRole("button", { name: "Lending" }).click();
      await expect(page.getByText("Emergency Loan to Friend")).toBeVisible();
      await expect(page.getByText("House Rent & Maintenance")).not.toBeVisible();

      // Allocation Composition Card
      await expect(page.getByText("Allocation Composition")).toBeVisible();
      await expect(page.getByText("Personal Spent")).toBeVisible();

      // Attributed Expense Categories Card
      await expect(page.getByText("Attributed Expense Categories")).toBeVisible();
      await expect(page.getByText("Housing & Rent")).toBeVisible();
    });

    test("renders exhausted source with duration and exhaustion banner", async ({ page }) => {
      await page.goto("/money/sources/src-2");

      await expect(
        page.getByRole("heading", { name: "September Freelance Design Retainer" })
      ).toBeVisible();
      await expect(page.getByText("Funding Batch Fully Exhausted").first()).toBeVisible();
      await expect(page.getByText(/Lasted 24 calendar days/i)).toBeVisible();
    });

    test("handles non-existent source identifier with honest empty state", async ({ page }) => {
      await page.goto("/money/sources/non-existent-id");

      await expect(page.getByText("Money Source Not Found")).toBeVisible();
      await expect(page.getByRole("link", { name: /Return to Money Sources/i })).toBeVisible();
    });
  });

  test.describe("Responsive Viewports Check (Zero Horizontal Scroll)", () => {
    const viewports = [
      { name: "mobile (375px)", width: 375, height: 667 },
      { name: "tablet (768px)", width: 768, height: 1024 },
      { name: "desktop (1440px)", width: 1440, height: 900 },
    ];

    const routes = ["/money/sources", "/money/sources/src-1", "/money/sources/src-2"];

    for (const vp of viewports) {
      for (const route of routes) {
        test(`renders ${route} cleanly on ${vp.name} without horizontal overflow`, async ({
          page,
        }) => {
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.goto(route);

          const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
          const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
          expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
        });
      }
    }
  });
});
