import { test, expect } from "@playwright/test";

test.describe("Frontend Phase 6 — Budget Management, Financial Analytics, Reports & CSV Export E2E", () => {
  test.describe("Budget Management (/budgets)", () => {
    test("loads /budgets with hero overview, financial invariants and category cards", async ({
      page,
    }) => {
      const response = await page.goto("/budgets");
      expect(response?.status()).toBe(200);

      // Title & Heading
      await expect(page.getByRole("heading", { name: "Budget Management" })).toBeVisible();
      await expect(page.getByText("Phase 6 UI").first()).toBeVisible();

      // Monthly Spending Budget Overview Card
      await expect(page.getByText("Monthly Spending Budget")).toBeVisible();
      await expect(page.getByText("Overall Budget Limit")).toBeVisible();
      await expect(page.getByText("Personal Spent")).toBeVisible();
      await expect(page.getByText("Budget Remaining", { exact: true })).toBeVisible();
      await expect(page.getByText("Overall Utilization Progress")).toBeVisible();

      // Financial Invariant Notice
      await expect(
        page.getByText("Budget Remaining ≠ Actual Account Balance ≠ Safe-to-Spend")
      ).toBeVisible();

      // Category Budgets Grid
      await expect(page.getByText("Category Spending Budgets")).toBeVisible();
      await expect(page.getByText("Food & Groceries").first()).toBeVisible();
      await expect(page.getByText("Living Expenses").first()).toBeVisible();
      await expect(page.getByText("Dining & Entertainment").first()).toBeVisible();

      // Status Badges
      await expect(page.getByText("On Track").first()).toBeVisible();
      await expect(page.getByText("Approaching Limit (80%+)").first()).toBeVisible();
      await expect(page.getByText("100% Utilized").first()).toBeVisible();
      await expect(page.getByText("Over Budget").first()).toBeVisible();
    });

    test("filters category budgets using search input and tab pills", async ({ page }) => {
      await page.goto("/budgets");

      const searchInput = page.getByPlaceholder(/Search category/i);
      await expect(searchInput).toBeVisible();

      // Search for Groceries
      await searchInput.fill("Groceries");
      await expect(page.getByText("Food & Groceries").first()).toBeVisible();
      await expect(page.getByText("Transit & Fuel")).not.toBeVisible();

      // Clear search
      await searchInput.fill("");
      await expect(page.getByText("Transit & Fuel").first()).toBeVisible();

      // Filter by Over Budget tab pill
      await page.getByRole("button", { name: /Over Budget/i }).click();
      await expect(page.getByText("Living Expenses").first()).toBeVisible();
      await expect(page.getByText("Food & Groceries")).not.toBeVisible();

      // Filter by On Track tab pill
      await page.getByRole("button", { name: /On Track/i }).click();
      await expect(page.getByText("Utilities & Bills").first()).toBeVisible();
      await expect(page.getByText("Living Expenses")).not.toBeVisible();

      // Return to All tab
      await page.getByRole("button", { name: /All \(/i }).click();
      await expect(page.getByText("Food & Groceries").first()).toBeVisible();
    });

    test("navigates calendar periods using period selector", async ({ page }) => {
      await page.goto("/budgets");

      await expect(page.getByText("October 2026")).toBeVisible();

      // Click previous month
      await page.getByRole("button", { name: "Previous month" }).click();
      await expect(page.getByText("September 2026")).toBeVisible();

      // Click next month twice to go to November 2026
      await page.getByRole("button", { name: "Next month" }).click();
      await page.getByRole("button", { name: "Next month" }).click();
      await expect(page.getByText("November 2026")).toBeVisible();
    });

    test("switches between preview, honest empty, and loading skeleton states", async ({
      page,
    }) => {
      await page.goto("/budgets");

      // Switch to Empty
      await page.getByRole("tab", { name: "Empty" }).click();
      await expect(page.getByText(/No Spending Budgets Configured/i)).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Set Up Monthly Budget" }).first()
      ).toBeVisible();
      await expect(
        page.getByText("Budget Principle: Discretionary Ceiling, Not Liquid Cash")
      ).toBeVisible();

      // Switch to Loading
      await page.getByRole("tab", { name: "Loading" }).click();
      await expect(page.getByLabel("Loading budgets")).toBeVisible();

      // Switch back to Preview
      await page.getByRole("tab", { name: "Preview" }).click();
      await expect(page.getByText("Monthly Spending Budget")).toBeVisible();
      await expect(page.getByText("Category Spending Budgets")).toBeVisible();
    });

    test("opens BudgetModal, validates inputs, and presents integration pending banner", async ({
      page,
    }) => {
      await page.goto("/budgets");

      // Open Add Category Budget modal
      await page.getByRole("button", { name: "Add Category Budget" }).first().click();
      await expect(page.getByRole("heading", { name: "Create Budget Plan" })).toBeVisible();

      // Try submitting empty
      await page.getByRole("button", { name: "Save Budget" }).click();
      await expect(page.getByText(/Budget amount is required|Enter a valid amount/i)).toBeVisible();

      // Fill in valid details
      await page.selectOption("#category", "Healthcare & Medical");
      await page.fill("#amount", "12500");
      await page.fill("#notes", "Medicine and quarterly clinic visits");

      // Submit form
      await page.getByRole("button", { name: "Save Budget" }).click();

      // Integration pending banner rendered
      await expect(page.getByText("Validation Successful")).toBeVisible();
      await expect(
        page.getByText(/In Phase 7 integration, budgets persist to Django/i)
      ).toBeVisible();

      // Close modal
      await page.getByRole("button", { name: "Done" }).click();
      await expect(page.getByRole("heading", { name: "Create Budget Plan" })).not.toBeVisible();
    });

    test("opens BudgetModal in edit mode from category card", async ({ page }) => {
      await page.goto("/budgets");

      // Click edit icon on Food & Groceries
      await page.getByLabel("Edit Food & Groceries limit").click();
      await expect(page.getByRole("heading", { name: "Edit Budget Limit" })).toBeVisible();
      await expect(page.locator("#amount")).toHaveValue("18000.00");

      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByRole("heading", { name: "Edit Budget Limit" })).not.toBeVisible();
    });
  });

  test.describe("Financial Analytics & Reports (/reports)", () => {
    test("loads /reports with KPI summary cards, comparisons, and charts", async ({ page }) => {
      const response = await page.goto("/reports");
      expect(response?.status()).toBe(200);

      // Title & Header
      await expect(
        page.getByRole("heading", { name: "Financial Analytics & Reports" })
      ).toBeVisible();
      await expect(page.getByText("Phase 6 UI").first()).toBeVisible();

      // 6 Metric KPI Grid
      await expect(page.getByText("Personal Expenses").first()).toBeVisible();
      await expect(page.getByText("Eligible Inflows").first()).toBeVisible();
      await expect(page.getByText("Net Cash Flow").first()).toBeVisible();
      await expect(page.getByText("Daily Average").first()).toBeVisible();
      await expect(page.getByText("Peak Spending Day").first()).toBeVisible();
      await expect(page.getByText("Total Transactions").first()).toBeVisible();

      // Cycle-over-Cycle Financial Comparison
      await expect(page.getByText("Cycle-over-Cycle Comparison")).toBeVisible();
      await expect(page.getByText("Spending Reduced")).toBeVisible();
      await expect(page.getByText("Spending Variance")).toBeVisible();

      // Charts & Visualizations
      await expect(page.getByText("Spending Velocity & Trend")).toBeVisible();
      await expect(page.getByText("Expense Allocation by Category")).toBeVisible();
      await expect(page.getByText("Earned Inflows vs Personal Expenses")).toBeVisible();
      await expect(page.getByText("Spending Channels & Distribution")).toBeVisible();

      // Accounting Rule Banner
      await expect(page.getByText(/Accounting Rule:/i)).toBeVisible();

      // Detailed Expenditure Breakdown Accordion
      await expect(page.getByText("Detailed Expenditure Breakdown")).toBeVisible();
      await expect(page.getByText("Category Itemized Summaries")).toBeVisible();
      await expect(page.getByRole("link", { name: /View All Transactions/i })).toBeVisible();
    });

    test("toggles trend intervals and spending distribution channels", async ({ page }) => {
      await page.goto("/reports");

      // Trend interval toggles (Daily, Weekly, Monthly)
      await page.getByRole("tab", { name: "Weekly" }).click();
      await page.getByRole("tab", { name: "Monthly" }).click();
      await page.getByRole("tab", { name: "Daily" }).click();

      // Distribution channel tabs (By Account, By Method, By Merchant, By Person)
      await page.getByRole("tab", { name: "By Method" }).click();
      await expect(page.getByText("UPI QR / Direct")).toBeVisible();

      await page.getByRole("tab", { name: "By Merchant" }).click();
      await expect(page.getByText("Nature's Basket & Supermarket")).toBeVisible();

      await page.getByRole("tab", { name: "By Person" }).click();
      await expect(page.getByText("Vikram Mehta (Shared Split)")).toBeVisible();

      await page.getByRole("tab", { name: "By Account" }).click();
      await expect(page.getByText("HDFC Salary Account")).toBeVisible();
    });

    test("interacts with report filters and custom date range validation", async ({ page }) => {
      await page.goto("/reports");

      // Click Last 7 Days preset
      await page.getByRole("button", { name: "Last 7 Days" }).click();
      await expect(page.getByText("Active filters:")).toBeVisible();
      await expect(page.getByText(/Period: last 7 days/i)).toBeVisible();

      // Click Custom Range
      await page.getByRole("button", { name: "Custom Range" }).click();
      await expect(page.getByText("Custom Date Range:")).toBeVisible();
      await expect(page.getByRole("button", { name: "Apply Dates" })).toBeVisible();

      // Reset filters
      await page.getByRole("button", { name: "Reset" }).click();
      await expect(page.getByText("Active filters:")).not.toBeVisible();
    });

    test("switches between populated, empty, and loading views on /reports", async ({ page }) => {
      await page.goto("/reports");

      // Switch to Empty
      await page.getByRole("tab", { name: "Empty" }).click();
      await expect(page.getByText("No Analytics Data Available")).toBeVisible();
      await expect(page.getByRole("button", { name: "Reset Filters" })).toBeVisible();

      // Switch to Loading
      await page.getByRole("tab", { name: "Loading" }).click();
      await expect(page.getByLabel("Loading analytics dashboard")).toBeVisible();

      // Switch back to Preview
      await page.getByRole("tab", { name: "Preview" }).click();
      await expect(page.getByText("Spending Velocity & Trend")).toBeVisible();
    });

    test("opens CSV Export Dialog, displays format specs, and enforces backend integration lock", async ({
      page,
    }) => {
      await page.goto("/reports");

      // Click Export CSV button
      await page.getByRole("button", { name: "Export CSV" }).click();
      await expect(
        page.getByRole("heading", { name: "Export Financial Ledger (CSV)" })
      ).toBeVisible();

      // CSV Schema Spec Box
      await expect(page.getByText(/Standard Output Schema/i)).toBeVisible();
      await expect(page.getByText(/• Date \(ISO 8601\)/i)).toBeVisible();
      await expect(page.getByText(/• Amount \(INR\)/i)).toBeVisible();

      // Backend integration pending notice
      await expect(
        page.getByRole("dialog").getByText("Backend Integration Pending", { exact: true })
      ).toBeVisible();
      await expect(page.getByText(/CSV export available after backend integration/i)).toBeVisible();

      // Validate & Request Export button
      await page.getByRole("button", { name: "Validate & Request Export" }).click();
      await expect(page.getByText("Export Configuration Validated")).toBeVisible();

      // Close modal
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(
        page.getByRole("heading", { name: "Export Financial Ledger (CSV)" })
      ).not.toBeVisible();
    });
  });

  test.describe("Responsive Layout Verification", () => {
    test("renders /budgets without horizontal overflow on mobile (375px)", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/budgets");

      await expect(page.getByRole("heading", { name: "Budget Management" })).toBeVisible();
      await expect(page.getByText("Monthly Spending Budget")).toBeVisible();
      await expect(page.getByText("Overall Budget Limit")).toBeVisible();

      // Verify no horizontal overflow
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
    });

    test("renders /reports without horizontal overflow on mobile (375px)", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/reports");

      await expect(
        page.getByRole("heading", { name: "Financial Analytics & Reports" })
      ).toBeVisible();
      await expect(page.getByText("Personal Expenses").first()).toBeVisible();

      // Verify no horizontal overflow
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
    });

    test("renders /reports cleanly on tablet (768px)", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto("/reports");

      await expect(
        page.getByRole("heading", { name: "Financial Analytics & Reports" })
      ).toBeVisible();
      await expect(page.getByText("Spending Velocity & Trend")).toBeVisible();
      await expect(page.getByText("Expense Allocation by Category")).toBeVisible();
    });

    test("renders /budgets cleanly on desktop (1440px)", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/budgets");

      await expect(page.getByRole("heading", { name: "Budget Management" })).toBeVisible();
      await expect(page.getByText("Food & Groceries").first()).toBeVisible();
      await expect(page.getByText("Living Expenses").first()).toBeVisible();
    });
  });

  test.describe("Navigation Integration Across App", () => {
    test("navigates to /budgets and /reports from AppNav", async ({ page }) => {
      await page.goto("/dashboard");

      // AppNav contains Budgets and Reports links
      const budgetsLink = page.getByRole("link", { name: /Budgets/i }).first();
      await expect(budgetsLink).toBeVisible();
      await budgetsLink.click();
      await expect(page).toHaveURL(/\/budgets/);

      const reportsLink = page.getByRole("link", { name: /Reports & Analytics/i }).first();
      await expect(reportsLink).toBeVisible();
      await reportsLink.click();
      await expect(page).toHaveURL(/\/reports/);
    });
  });
});
