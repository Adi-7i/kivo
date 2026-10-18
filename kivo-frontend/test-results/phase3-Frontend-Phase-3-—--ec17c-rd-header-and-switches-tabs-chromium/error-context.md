# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase3.spec.ts >> Frontend Phase 3 — Financial Dashboard, Money Accounts & Transactions E2E >> Financial Dashboard (/dashboard) >> opens Quick Add modal from dashboard header and switches tabs
- Location: e2e/phase3.spec.ts:32:9

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Quick Add Transaction')
Expected: visible
Error: strict mode violation: getByText('Quick Add Transaction') resolved to 2 elements:
    1) <div data-slot="alert-description" class="text-balance md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4 text-muted-foreground mt-1 text-xs">Demonstrating 8 distinct summary metrics, Rechart…</div> aka getByText('Demonstrating 8 distinct')
    2) <span>Quick Add Transaction</span> aka getByText('Quick Add Transaction', { exact: true })

Call log:
  - Expect "toBeVisible" getByText('Quick Add Transaction') with timeout 5000ms
  - waiting for getByText('Quick Add Transaction')

```

# Page snapshot

```yaml
- generic:
  - generic [aria-hidden]:
    - banner:
      - generic:
        - generic:
          - generic:
            - link:
              - /url: /
              - generic: K
              - generic:
                - generic: Kivo
                - generic: Personal Finance
            - generic: Phase 1 Foundation
          - generic: API Transport Ready
    - generic:
      - navigation:
        - generic:
          - link:
            - /url: /dashboard
            - generic: Dashboard
            - generic: Phase 3
          - link:
            - /url: /money
            - generic: Money Accounts
            - generic: Phase 3
          - link:
            - /url: /transactions
            - generic: Transactions
            - generic: Phase 3
          - link:
            - /url: /
            - generic: Design System
            - generic: Phase 1
          - link:
            - /url: /login
            - generic: Sign In
            - generic: Phase 2
          - link:
            - /url: /register
            - generic: Register
            - generic: Phase 2
          - link:
            - /url: /onboarding
            - generic: Onboarding
            - generic: Phase 2
          - link:
            - /url: /settings/profile
            - generic: Profile
            - generic: Phase 2
          - generic:
            - generic: Funds & Attribution
            - generic: Phase 4
          - generic:
            - generic: Sharing & Rent
            - generic: Phase 5
          - generic:
            - generic: Budgets & Analytics
            - generic: Phase 6
      - main:
        - alert:
          - generic: Financial Dashboard Architecture (Phase 3)
          - generic: Demonstrating 8 distinct summary metrics, Recharts daily spending analytics, category distributions, and the accessible Quick Add transaction modal. All values operate under integer paise invariants.
        - generic:
          - generic:
            - generic:
              - heading [level=1]: Personal Workspace
              - generic: Phase 3
            - generic:
              - generic: Saturday, 17 October 2026
              - generic: •
              - generic: Integer Paise • IST (UTC+05:30)
          - generic:
            - button:
              - generic: Quick Add
        - generic:
          - button:
            - generic: Add Expense
          - button:
            - generic: Money Received
          - button:
            - generic: Transfer
          - link:
            - /url: /transactions
            - generic: Full History
        - generic:
          - generic:
            - heading [level=2]: Financial Position Summary
            - generic: Total Balance ≠ Safe-to-Spend
          - generic:
            - generic:
              - generic:
                - generic: Total Liquid Balance
                - generic:
                  - generic: ₹53,250.00
                  - paragraph: All active cash, bank & wallet balances
            - generic:
              - generic:
                - generic: Safe-to-Spend
                - generic:
                  - generic: ₹38,250.00
                  - paragraph: Liquid funds minus reserved obligations
            - generic:
              - generic:
                - generic: Today's Expenses
                - generic:
                  - generic: ₹450.00
                  - paragraph: Expenditures on current calendar date
            - generic:
              - generic:
                - generic: Monthly Expenses
                - generic:
                  - generic: ₹14,500.00
                  - paragraph: Total personal expenses this month
            - generic:
              - generic:
                - generic: Money Received
                - generic:
                  - generic: ₹75,000.00
                  - paragraph: Income & external inflows this month
            - generic:
              - generic:
                - generic: Owed to You (Asset)
                - generic:
                  - generic: ₹5,000.00
                  - paragraph: Receivables from loans given to friends
            - generic:
              - generic:
                - generic: Owed by You (Liability)
                - generic:
                  - generic: ₹2,000.00
                  - paragraph: Payables from borrowed funds
            - generic:
              - generic:
                - generic: Reserved Obligations
                - generic:
                  - generic: ₹15,000.00
                  - paragraph: Earmarked for upcoming fixed expenses
        - generic:
          - generic:
            - generic:
              - generic:
                - generic: Daily Spending Trend
                - generic: Calendar-faithful expenditures across active ledger accounts.
              - generic:
                - button: Last 7 Days
                - button: Last 30 Days
            - generic:
              - generic:
                - generic:
                  - generic:
                    - application:
                      - generic:
                        - generic:
                          - generic: 11 Oct
                          - generic: 12 Oct
                          - generic: 13 Oct
                          - generic: 14 Oct
                          - generic: 15 Oct
                          - generic: 16 Oct
                          - generic: 17 Oct
                        - generic:
                          - generic: ₹0
                          - generic: ₹800
                          - generic: ₹1600
                          - generic: ₹2400
                          - generic: ₹3200
              - generic:
                - table:
                  - caption: Daily Spending Summary
                  - rowgroup:
                    - row:
                      - columnheader: Date
                      - columnheader: Expense Amount
                  - rowgroup:
                    - row:
                      - cell: 2026-10-11
                      - cell: ₹1,200.00
                    - row:
                      - cell: 2026-10-12
                      - cell: ₹850.00
                    - row:
                      - cell: 2026-10-13
                      - cell: ₹2,400.00
                    - row:
                      - cell: 2026-10-14
                      - cell: ₹650.00
                    - row:
                      - cell: 2026-10-15
                      - cell: ₹1,900.00
                    - row:
                      - cell: 2026-10-16
                      - cell: ₹3,100.00
                    - row:
                      - cell: 2026-10-17
                      - cell: ₹450.00
          - generic:
            - generic:
              - generic: Expense by Category
              - generic: Monthly expenditure distribution by classification.
            - generic:
              - generic:
                - generic:
                  - generic: Food & Groceries
                  - generic:
                    - generic: 43%
                    - generic: ₹6,200.00
              - generic:
                - generic:
                  - generic: Utilities & Bills
                  - generic:
                    - generic: 24%
                    - generic: ₹3,500.00
              - generic:
                - generic:
                  - generic: Transit & Fuel
                  - generic:
                    - generic: 17%
                    - generic: ₹2,400.00
              - generic:
                - generic:
                  - generic: Entertainment
                  - generic:
                    - generic: 10%
                    - generic: ₹1,500.00
              - generic:
                - generic:
                  - generic: Other
                  - generic:
                    - generic: 6%
                    - generic: ₹900.00
        - generic:
          - generic:
            - generic:
              - generic:
                - generic: Money Repositories
                - generic: Current balances across your owned accounts.
              - link:
                - /url: /money
                - generic: Manage
            - generic:
              - generic:
                - generic: HDFC Salary Account
                - generic: ₹48,500.00
              - generic:
                - generic: Physical Cash Stash
                - generic: ₹3,500.00
              - generic:
                - generic: Amazon Pay Wallet
                - generic: ₹1,250.00
          - generic:
            - generic:
              - generic:
                - generic: Recent Activity
                - generic: Latest chronological events recorded in your ledger.
              - link:
                - /url: /transactions
                - generic: View all
            - generic:
              - generic:
                - generic:
                  - generic:
                    - generic: Personal Expense
                    - generic:
                      - paragraph: Zepto Quick Groceries
                      - paragraph: HDFC Salary Account • Food & Groceries • 17 Oct 2026
                  - generic: +₹450.00
                - generic:
                  - generic:
                    - generic: Own Transfer
                    - generic:
                      - paragraph: ATM Cash Withdrawal
                      - paragraph: HDFC Salary Account • 16 Oct 2026
                  - generic: ₹2,000.00
                - generic:
                  - generic:
                    - generic: Money Received
                    - generic:
                      - paragraph: Freelance Design Retainer
                      - paragraph: HDFC Salary Account • 15 Oct 2026
                  - generic: +₹5,000.00
                - generic:
                  - generic:
                    - generic: Personal Expense
                    - generic:
                      - paragraph: Electricity & Water Bill
                      - paragraph: HDFC Salary Account • Utilities & Bills • 15 Oct 2026
                  - generic: +₹1,900.00
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e6] [cursor=pointer]
  - alert
  - generic [aria-hidden]: ₹0
  - dialog [ref=e11]:
    - generic [ref=e12]:
      - heading "Quick Add Transaction" [level=2] [ref=e13]
      - paragraph [ref=e17]: Record a new personal expense, incoming money, or account transfer.
    - generic [ref=e18]:
      - tablist [ref=e19]:
        - tab "Expense" [active] [selected] [ref=e20]
        - tab "Received" [ref=e25]
        - tab "Transfer" [ref=e30]
      - tabpanel "Expense" [ref=e35]:
        - generic [ref=e36]:
          - generic [ref=e37]:
            - generic [ref=e38]:
              - generic [ref=e40]:
                - text: Amount (₹)
                - generic [ref=e41]: "*"
              - textbox "Amount (₹) *" [ref=e42]:
                - /placeholder: "0.00"
            - generic [ref=e43]:
              - generic [ref=e45]:
                - text: Effective Date
                - generic [ref=e46]: "*"
              - textbox "Effective Date *" [ref=e47]: 2026-10-18
          - generic [ref=e48]:
            - generic [ref=e50]:
              - text: Description / Title
              - generic [ref=e51]: "*"
            - textbox "Description / Title *" [ref=e52]:
              - /placeholder: e.g. Grocery supplies, Coffee, Electricity bill
          - generic [ref=e53]:
            - generic [ref=e54]:
              - generic [ref=e55]:
                - text: Category
                - generic [ref=e56]: "*"
              - combobox "Category *" [ref=e57]:
                - option "Food & Groceries" [selected]
                - option "Utilities & Bills"
                - option "Transit & Fuel"
                - option "Living Expenses"
                - option "Shopping & Personal"
                - option "Healthcare"
                - option "Entertainment"
                - option "Other"
            - generic [ref=e58]:
              - generic [ref=e59]:
                - text: Payment Account
                - generic [ref=e60]: "*"
              - combobox "Payment Account *" [ref=e61]:
                - option "HDFC Salary Account" [selected]
                - option "Physical Cash Stash"
                - option "Amazon Pay Wallet"
          - generic [ref=e62]:
            - generic [ref=e63]:
              - generic [ref=e64]: Merchant / Payee
              - textbox "Merchant / Payee" [ref=e66]:
                - /placeholder: e.g. Zepto, Starbucks, Swiggy
            - generic [ref=e67]:
              - generic [ref=e68]: Payment Method
              - textbox "Payment Method" [ref=e70]:
                - /placeholder: e.g. UPI, Debit Card, Cash
                - text: UPI
          - generic [ref=e71]:
            - button "Cancel" [ref=e72]
            - button "Record Expense" [ref=e73]
    - button "Close" [ref=e75]
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
> 39  |       await expect(page.getByText("Quick Add Transaction")).toBeVisible();
      |                                                             ^ Error: expect(locator).toBeVisible() failed
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
  59  |       await expect(page.getByText("Total Liquid Funds")).toBeVisible();
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
```