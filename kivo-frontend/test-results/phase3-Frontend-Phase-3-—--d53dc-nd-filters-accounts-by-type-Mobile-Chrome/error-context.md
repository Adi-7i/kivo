# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase3.spec.ts >> Frontend Phase 3 — Financial Dashboard, Money Accounts & Transactions E2E >> Money Accounts (/money) >> loads accounts overview and filters accounts by type
- Location: e2e/phase3.spec.ts:55:9

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  getByText('Total Liquid Funds')
Expected: visible
Received: hidden
Timeout:  5000ms

Call log:
  - Expect "toBeVisible" getByText('Total Liquid Funds') with timeout 5000ms
  - waiting for getByText('Total Liquid Funds')
    14 × locator resolved to <span class="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Total Liquid Funds</span>
       - unexpected value "hidden"

```

```yaml
- banner:
  - link "K Kivo Personal Finance":
    - /url: /
  - text: Phase 1 Foundation API Transport Ready
- navigation "Application navigation":
  - link "Dashboard Phase 3":
    - /url: /dashboard
  - link "Money Accounts Phase 3":
    - /url: /money
  - link "Transactions Phase 3":
    - /url: /transactions
  - link "Design System Phase 1":
    - /url: /
  - link "Sign In Phase 2":
    - /url: /login
  - link "Register Phase 2":
    - /url: /register
  - link "Onboarding Phase 2":
    - /url: /onboarding
  - link "Profile Phase 2":
    - /url: /settings/profile
  - text: Funds & Attribution Phase 4 Sharing & Rent Phase 5 Budgets & Analytics Phase 6
- main:
  - alert: Money Accounts UI Architecture This screen displays the account presentation layout, balance cards, and interactive modal dialog. Real financial transactions and backend ledger state will sync with Django in Phase 4.
  - heading "Money Accounts" [level=2]
  - paragraph: Manage your bank checking, physical cash, and digital wallets. Each account tracks exact ledger postings.
  - button "Add Account"
  - button "All (3)"
  - button "Banks"
  - button "Cash"
  - button "Wallets"
  - heading "HDFC Salary Account" [level=3]
  - paragraph: Opened 10 Jan 2026
  - text: bank Current Balance ₹48,500.00
  - link "View activity":
    - /url: /transactions?accountId=acc-bank-1
  - button "Edit"
  - heading "Physical Cash Stash" [level=3]
  - paragraph: Opened 10 Jan 2026
  - text: cash Current Balance ₹3,500.00
  - link "View activity":
    - /url: /transactions?accountId=acc-cash-1
  - button "Edit"
  - heading "Amazon Pay Wallet" [level=3]
  - paragraph: Opened 01 Feb 2026
  - text: wallet Current Balance ₹1,250.00
  - link "View activity":
    - /url: /transactions?accountId=acc-wallet-1
  - button "Edit"
- region "Notifications alt+T"
- alert
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | 
  3   | test.describe("Frontend Phase 3 — Financial Dashboard, Money Accounts & Transactions E2E", () => {
  4   |   test.describe("Financial Dashboard (/dashboard)", () => {
  5   |     test("loads dashboard and renders overview header, 8 summary cards and quick actions", async ({
  6   |       page,
  7   |     }) => {
  8   |       const response = await page.goto("/dashboard");
  9   |       expect(response?.status()).toBe(200);
  10  | 
  11  |       // Verify title and main heading
  12  |       await expect(page).toHaveTitle(/Kivo/i);
  13  |       await expect(page.getByRole("heading", { name: "Personal Workspace" })).toBeVisible();
  14  | 
  15  |       // Verify 8 Financial Summary cards
  16  |       await expect(page.getByText("Total Liquid Balance")).toBeVisible();
  17  |       await expect(page.getByText("Safe-to-Spend")).toBeVisible();
  18  |       await expect(page.getByText("Today's Expenses")).toBeVisible();
  19  |       await expect(page.getByText("Monthly Expenses")).toBeVisible();
  20  |       await expect(page.getByText("Money Received")).toBeVisible();
  21  |       await expect(page.getByText("Owed to You (Asset)")).toBeVisible();
  22  |       await expect(page.getByText("Owed by You (Liability)")).toBeVisible();
  23  |       await expect(page.getByText("Reserved Obligations")).toBeVisible();
  24  | 
  25  |       // Verify analytics and activity components
  26  |       await expect(page.getByText("Daily Spending Trend")).toBeVisible();
  27  |       await expect(page.getByText("Expense by Category")).toBeVisible();
  28  |       await expect(page.getByText("Money Repositories")).toBeVisible();
  29  |       await expect(page.getByText("Recent Activity")).toBeVisible();
  30  |     });
  31  | 
  32  |     test("opens Quick Add modal from dashboard header and switches tabs", async ({ page }) => {
  33  |       await page.goto("/dashboard");
  34  | 
  35  |       // Click Quick Add CTA in header
  36  |       const quickAddBtn = page.getByRole("button", { name: /Quick Add/i }).first();
  37  |       await quickAddBtn.click();
  38  | 
  39  |       await expect(page.getByText("Quick Add Transaction")).toBeVisible();
  40  |       await expect(page.getByRole("tab", { name: /Expense/i })).toBeVisible();
  41  |       await expect(page.getByRole("tab", { name: /Received/i })).toBeVisible();
  42  |       await expect(page.getByRole("tab", { name: /Transfer/i })).toBeVisible();
  43  | 
  44  |       // Switch to Transfer and check invariant notice
  45  |       await page.getByRole("tab", { name: /Transfer/i }).click();
  46  |       await expect(page.getByText(/Movement ≠ Expense/i)).toBeVisible();
  47  | 
  48  |       // Close modal
  49  |       await page.getByRole("button", { name: /Close/i }).click();
  50  |       await expect(page.getByText("Quick Add Transaction")).not.toBeVisible();
  51  |     });
  52  |   });
  53  | 
  54  |   test.describe("Money Accounts (/money)", () => {
  55  |     test("loads accounts overview and filters accounts by type", async ({ page }) => {
  56  |       await page.goto("/money");
  57  | 
  58  |       await expect(page.getByRole("heading", { name: "Money Accounts" })).toBeVisible();
> 59  |       await expect(page.getByText("Total Liquid Funds")).toBeVisible();
      |                                                          ^ Error: expect(locator).toBeVisible() failed
  60  |       await expect(page.getByText("HDFC Salary Account")).toBeVisible();
  61  |       await expect(page.getByText("Physical Cash Stash")).toBeVisible();
  62  | 
  63  |       // Click Banks filter pill
  64  |       await page.getByRole("button", { name: /Banks/i }).click();
  65  |       await expect(page.getByText("HDFC Salary Account")).toBeVisible();
  66  |       await expect(page.getByText("Physical Cash Stash")).not.toBeVisible();
  67  | 
  68  |       // Click All filter pill
  69  |       await page.getByRole("button", { name: /^All/i }).click();
  70  |       await expect(page.getByText("Physical Cash Stash")).toBeVisible();
  71  |     });
  72  | 
  73  |     test("opens Add Account modal and validates inputs with invariant explanation", async ({ page }) => {
  74  |       await page.goto("/money");
  75  | 
  76  |       await page.getByRole("button", { name: /Add Account/i }).click();
  77  |       await expect(page.getByRole("heading", { name: "Add Money Account" })).toBeVisible();
  78  |       await expect(page.getByText("Opening Balance is Not Income")).toBeVisible();
  79  |       await expect(page.getByText(/Note on UPI:/i)).toBeVisible();
  80  | 
  81  |       // Fill valid account data
  82  |       await page.getByLabel(/Account Name/i).fill("Axis Emergency Reserve");
  83  |       await page.getByLabel(/Opening Balance/i).fill("10000");
  84  | 
  85  |       // Submit and check integration pending badge
  86  |       await page.getByRole("button", { name: /Create Account/i }).click();
  87  |       await expect(
  88  |         page.getByText(/Backend integration pending: Account creation with opening ledger entry/i)
  89  |       ).toBeVisible();
  90  |     });
  91  |   });
  92  | 
  93  |   test.describe("Transaction History (/transactions)", () => {
  94  |     test("loads transactions page, filters by search, and navigates to detail", async ({ page }) => {
  95  |       await page.goto("/transactions");
  96  | 
  97  |       await expect(page.getByRole("heading", { name: "Transaction Activity" })).toBeVisible();
  98  |       await expect(page.getByPlaceholder(/Search title, merchant, notes/i)).toBeVisible();
  99  |       await expect(page.getByText("Zepto Quick Groceries")).toBeVisible();
  100 | 
  101 |       // Filter by search
  102 |       await page.getByPlaceholder(/Search title, merchant, notes/i).fill("Zepto");
  103 |       await expect(page.getByText("Zepto Quick Groceries")).toBeVisible();
  104 |       await expect(page.getByText("ATM Cash Withdrawal")).not.toBeVisible();
  105 | 
  106 |       // Reset search
  107 |       await page.getByRole("button", { name: /Reset Filters/i }).click();
  108 |       await expect(page.getByText("ATM Cash Withdrawal")).toBeVisible();
  109 |     });
  110 | 
  111 |     test("filters transactions by type pills", async ({ page }) => {
  112 |       await page.goto("/transactions");
  113 | 
  114 |       // Click Transfer filter pill
  115 |       await page.getByRole("button", { name: "transfer" }).click();
  116 |       await expect(page.getByText("ATM Cash Withdrawal")).toBeVisible();
  117 |       await expect(page.getByText("Zepto Quick Groceries")).not.toBeVisible();
  118 |     });
  119 |   });
  120 | 
  121 |   test.describe("Transaction Detail (/transactions/[id])", () => {
  122 |     test("renders full ledger event attributes and double-entry postings", async ({ page }) => {
  123 |       await page.goto("/transactions/tx-1");
  124 | 
  125 |       await expect(page.getByText("Zepto Quick Groceries")).toBeVisible();
  126 |       await expect(page.getByText("Effective Date")).toBeVisible();
  127 |       await expect(page.getByText("HDFC Salary Account")).toBeVisible();
  128 |       await expect(page.getByText("Ledger Postings Breakdown")).toBeVisible();
  129 |       await expect(page.getByText("Leg 1: Asset Balance Adjustment")).toBeVisible();
  130 |       await expect(page.getByText("Immutable Ledger Entry")).toBeVisible();
  131 | 
  132 |       // Click Reversal / Correction button
  133 |       await page.getByRole("button", { name: /Record Reversal \/ Correction/i }).click();
  134 |       await expect(
  135 |         page.getByText(/Backend integration pending: Transaction corrections and ledger reversals/i)
  136 |       ).toBeVisible();
  137 |     });
  138 |   });
  139 | 
  140 |   test.describe("Responsive Viewports Check (Zero Horizontal Scroll)", () => {
  141 |     const viewports = [
  142 |       { name: "mobile (375px)", width: 375, height: 667 },
  143 |       { name: "tablet (768px)", width: 768, height: 1024 },
  144 |       { name: "desktop (1440px)", width: 1440, height: 900 },
  145 |     ];
  146 | 
  147 |     const routes = ["/dashboard", "/money", "/transactions", "/transactions/tx-1"];
  148 | 
  149 |     for (const vp of viewports) {
  150 |       for (const route of routes) {
  151 |         test(`renders ${route} cleanly on ${vp.name} without horizontal overflow`, async ({ page }) => {
  152 |           await page.setViewportSize({ width: vp.width, height: vp.height });
  153 |           await page.goto(route);
  154 | 
  155 |           const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  156 |           const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  157 |           expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  158 |         });
  159 |       }
```