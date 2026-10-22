import { test, expect } from "@playwright/test";

test.describe("Frontend Phase 3 — Financial Dashboard, Money Accounts & Transactions E2E", () => {
  test.describe("Financial Dashboard (/dashboard)", () => {
    test("loads dashboard and renders overview header, 8 summary cards and quick actions", async ({
      page,
    }) => {
      const response = await page.goto("/dashboard");
      expect(response?.status()).toBe(200);

      // Verify title and main heading
      await expect(page).toHaveTitle(/Kivo/i);
      await expect(page.getByRole("heading", { name: "Personal Workspace" })).toBeVisible();

      // Verify 8 Financial Summary cards
      await expect(page.getByText("Total Liquid Balance")).toBeVisible();
      await expect(page.getByText("Safe-to-Spend", { exact: true })).toBeVisible();
      await expect(page.getByText("Today's Expenses")).toBeVisible();
      await expect(page.getByText("Monthly Expenses")).toBeVisible();
      await expect(page.getByText("Money Received", { exact: true }).first()).toBeVisible();
      await expect(page.getByText("Owed to You (Asset)")).toBeVisible();
      await expect(page.getByText("Owed by You (Liability)")).toBeVisible();
      await expect(page.getByText("Reserved Obligations", { exact: true })).toBeVisible();

      // Verify analytics and activity components
      await expect(page.getByText("Daily Spending Trend")).toBeVisible();
      await expect(page.getByText("Expense by Category")).toBeVisible();
      await expect(page.getByText("Money Repositories")).toBeVisible();
      await expect(page.getByText("Recent Activity")).toBeVisible();
    });

    test("opens Quick Add modal from dashboard header and switches tabs", async ({ page }) => {
      await page.goto("/dashboard");

      // Click Quick Add CTA in header
      const quickAddBtn = page.getByRole("button", { name: /Quick Add/i }).first();
      await quickAddBtn.click();

      await expect(page.getByRole("heading", { name: "Quick Add Transaction" })).toBeVisible();
      await expect(page.getByRole("tab", { name: /Expense/i })).toBeVisible();
      await expect(page.getByRole("tab", { name: /Received/i })).toBeVisible();
      await expect(page.getByRole("tab", { name: /Transfer/i })).toBeVisible();

      // Switch to Transfer and check invariant notice
      await page.getByRole("tab", { name: /Transfer/i }).click();
      await expect(page.getByText(/Movement ≠ Expense/i)).toBeVisible();

      // Close modal
      await page.getByRole("button", { name: /Close/i }).click();
      await expect(page.getByRole("heading", { name: "Quick Add Transaction" })).not.toBeVisible();
    });
  });

  test.describe("Money Accounts (/money)", () => {
    test("loads accounts overview and filters accounts by type", async ({ page }) => {
      await page.goto("/money");

      await expect(page.getByRole("heading", { name: "Money Accounts" })).toBeVisible();
      await expect(page.getByText("Total Liquid Funds")).toBeVisible();
      await expect(page.getByText("HDFC Salary Account")).toBeVisible();
      await expect(page.getByText("Physical Cash Stash")).toBeVisible();

      // Click Banks filter pill
      await page.getByRole("button", { name: /Banks/i }).click();
      await expect(page.getByText("HDFC Salary Account")).toBeVisible();
      await expect(page.getByText("Physical Cash Stash")).not.toBeVisible();

      // Click All filter pill
      await page.getByRole("button", { name: /^All/i }).click();
      await expect(page.getByText("Physical Cash Stash")).toBeVisible();
    });

    test("opens Add Account modal and validates inputs with invariant explanation", async ({
      page,
    }) => {
      await page.goto("/money");

      await page.getByRole("button", { name: /Add Account/i }).click();
      await expect(page.getByRole("heading", { name: "Add Money Account" })).toBeVisible();
      await expect(page.getByText("Opening Balance is Not Income")).toBeVisible();
      await expect(page.getByText(/Note on UPI:/i)).toBeVisible();

      // Fill valid account data
      await page.getByLabel(/Account Name/i).fill("Axis Emergency Reserve");
      await page.getByLabel(/Opening Balance/i).fill("10000");

      // Submit and check integration pending badge
      await page.getByRole("button", { name: /Create Account/i }).click();
      await expect(
        page.getByText(/Backend integration pending: Account creation with opening ledger entry/i)
      ).toBeVisible();
    });
  });

  test.describe("Transaction History (/transactions)", () => {
    test("loads transactions page, filters by search, and navigates to detail", async ({
      page,
    }) => {
      await page.goto("/transactions");

      await expect(page.getByRole("heading", { name: "Transaction Activity" })).toBeVisible();
      await expect(page.getByPlaceholder(/Search title, merchant, notes/i)).toBeVisible();
      await expect(
        page.getByText("Zepto Quick Groceries").filter({ visible: true }).first()
      ).toBeVisible();

      // Filter by search
      await page.getByPlaceholder(/Search title, merchant, notes/i).fill("Zepto");
      await expect(
        page.getByText("Zepto Quick Groceries").filter({ visible: true }).first()
      ).toBeVisible();
      await expect(
        page.getByText("ATM Cash Withdrawal").filter({ visible: true })
      ).not.toBeVisible();

      // Reset search
      await page.getByRole("button", { name: /Reset Filters/i }).click();
      await expect(
        page.getByText("ATM Cash Withdrawal").filter({ visible: true }).first()
      ).toBeVisible();
    });

    test("filters transactions by type pills", async ({ page }) => {
      await page.goto("/transactions");

      // Click Transfer filter pill
      await page.getByRole("button", { name: "transfer" }).click();
      await expect(
        page.getByText("ATM Cash Withdrawal").filter({ visible: true }).first()
      ).toBeVisible();
      await expect(
        page.getByText("Zepto Quick Groceries").filter({ visible: true })
      ).not.toBeVisible();
    });
  });

  test.describe("Transaction Detail (/transactions/[id])", () => {
    test("renders full ledger event attributes and double-entry postings", async ({ page }) => {
      await page.goto("/transactions/tx-1");

      await expect(page.getByText("Zepto Quick Groceries").first()).toBeVisible();
      await expect(page.getByText("Effective Date")).toBeVisible();
      await expect(page.getByText("HDFC Salary Account").first()).toBeVisible();
      await expect(page.getByText("Ledger Postings Breakdown")).toBeVisible();
      await expect(page.getByText("Leg 1: Asset Balance Adjustment")).toBeVisible();
      await expect(page.getByText("Immutable Ledger Entry")).toBeVisible();

      // Click Reversal / Correction button
      await page.getByRole("button", { name: /Record Reversal \/ Correction/i }).click();
      await expect(
        page.getByText(/Backend integration pending: Transaction corrections and ledger reversals/i)
      ).toBeVisible();
    });
  });

  test.describe("Responsive Viewports Check (Zero Horizontal Scroll)", () => {
    const viewports = [
      { name: "mobile (375px)", width: 375, height: 667 },
      { name: "tablet (768px)", width: 768, height: 1024 },
      { name: "desktop (1440px)", width: 1440, height: 900 },
    ];

    const routes = ["/dashboard", "/money", "/transactions", "/transactions/tx-1"];

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
