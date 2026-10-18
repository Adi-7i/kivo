# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase3.spec.ts >> Frontend Phase 3 — Financial Dashboard, Money Accounts & Transactions E2E >> Transaction History (/transactions) >> filters transactions by type pills
- Location: e2e/phase3.spec.ts:111:9

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('ATM Cash Withdrawal')
Expected: visible
Error: strict mode violation: getByText('ATM Cash Withdrawal') resolved to 2 elements:
    1) <p class="font-semibold text-foreground">ATM Cash Withdrawal</p> aka getByRole('row', { name: '16 Oct 2026 Own Transfer ATM' }).getByRole('paragraph')
    2) <p class="font-semibold text-foreground group-hover:text-kivo-primary transition-colors">ATM Cash Withdrawal</p> aka getByText('ATM Cash Withdrawal').nth(1)

Call log:
  - Expect "toBeVisible" getByText('ATM Cash Withdrawal') with timeout 5000ms
  - waiting for getByText('ATM Cash Withdrawal')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - generic [ref=e5]:
        - generic [ref=e6]:
          - link "K Kivo Personal Finance" [ref=e7] [cursor=pointer]:
            - /url: /
            - generic [ref=e8]: K
            - generic [ref=e9]:
              - generic [ref=e10]: Kivo
              - generic [ref=e11]: Personal Finance
          - generic [ref=e12]: Phase 1 Foundation
        - generic [ref=e13]: API Transport Ready
    - generic [ref=e16]:
      - navigation "Application navigation" [ref=e17]:
        - generic [ref=e18]:
          - link "Dashboard Phase 3" [ref=e19] [cursor=pointer]:
            - /url: /dashboard
            - generic [ref=e20]: Dashboard
            - generic [ref=e21]: Phase 3
          - link "Money Accounts Phase 3" [ref=e22] [cursor=pointer]:
            - /url: /money
            - generic [ref=e23]: Money Accounts
            - generic [ref=e24]: Phase 3
          - link "Transactions Phase 3" [ref=e25] [cursor=pointer]:
            - /url: /transactions
            - generic [ref=e26]: Transactions
            - generic [ref=e27]: Phase 3
          - link "Design System Phase 1" [ref=e28] [cursor=pointer]:
            - /url: /
            - generic [ref=e29]: Design System
            - generic [ref=e30]: Phase 1
          - link "Sign In Phase 2" [ref=e31] [cursor=pointer]:
            - /url: /login
            - generic [ref=e32]: Sign In
            - generic [ref=e33]: Phase 2
          - link "Register Phase 2" [ref=e34] [cursor=pointer]:
            - /url: /register
            - generic [ref=e35]: Register
            - generic [ref=e36]: Phase 2
          - link "Onboarding Phase 2" [ref=e37] [cursor=pointer]:
            - /url: /onboarding
            - generic [ref=e38]: Onboarding
            - generic [ref=e39]: Phase 2
          - link "Profile Phase 2" [ref=e40] [cursor=pointer]:
            - /url: /settings/profile
            - generic [ref=e41]: Profile
            - generic [ref=e42]: Phase 2
          - generic [ref=e43]:
            - generic [ref=e44]: Funds & Attribution
            - generic [ref=e45]: Phase 4
          - generic [ref=e46]:
            - generic [ref=e47]: Sharing & Rent
            - generic [ref=e48]: Phase 5
          - generic [ref=e49]:
            - generic [ref=e50]: Budgets & Analytics
            - generic [ref=e51]: Phase 6
      - main [ref=e52]:
        - generic [ref=e53]:
          - generic [ref=e54]:
            - heading "Transaction Activity" [level=2] [ref=e56]
            - paragraph [ref=e57]: Complete chronological ledger events, filtering by account, date range, and categories.
          - button "Quick Add" [ref=e59]
        - generic [ref=e62]:
          - button "Today" [ref=e63] [cursor=pointer]
          - button "Yesterday" [ref=e64] [cursor=pointer]
          - button "This Week" [ref=e65] [cursor=pointer]
          - button "Last 7 Days" [ref=e66] [cursor=pointer]
          - button "This Month" [ref=e67] [cursor=pointer]
          - button "Previous Month" [ref=e68] [cursor=pointer]
          - button "This Year" [ref=e69] [cursor=pointer]
          - button "Custom Range" [ref=e70] [cursor=pointer]
        - generic [ref=e71]:
          - generic [ref=e72]:
            - textbox "Search title, merchant, notes..." [ref=e77]
            - combobox [ref=e78]:
              - option "All Accounts" [selected]
              - option "HDFC Salary Account"
              - option "Physical Cash Stash"
              - option "Amazon Pay Wallet"
            - combobox [ref=e79]:
              - option "All Categories" [selected]
              - option "Food & Groceries"
              - option "Utilities & Bills"
              - option "Transit & Fuel"
              - option "Living Expenses"
              - option "Entertainment"
              - option "Healthcare"
            - combobox [ref=e80]:
              - 'option "Date: Newest first" [selected]'
              - 'option "Date: Oldest first"'
              - 'option "Amount: Highest first"'
              - 'option "Amount: Lowest first"'
          - generic [ref=e81]:
            - generic [ref=e82]:
              - button "All Types" [ref=e83]
              - button "expense" [ref=e84]
              - button "receipt" [ref=e85]
              - button "transfer" [active] [ref=e86]
            - button "Reset Filters" [ref=e87]
        - generic [ref=e89]:
          - table [ref=e92]:
            - rowgroup [ref=e93]:
              - row [ref=e94]:
                - columnheader "Date" [ref=e95]
                - columnheader "Type" [ref=e96]
                - columnheader "Title & Merchant" [ref=e97]
                - columnheader "Category" [ref=e98]
                - columnheader "Account" [ref=e99]
                - columnheader "Status" [ref=e100]
                - columnheader "Amount" [ref=e101]
                - columnheader "Actions" [ref=e102]
            - rowgroup [ref=e104]:
              - row [ref=e105] [cursor=pointer]:
                - cell "16 Oct 2026" [ref=e106]
                - cell "Own Transfer" [ref=e107]
                - cell [ref=e110]:
                  - paragraph [ref=e112]: ATM Cash Withdrawal
                - cell "—" [ref=e113]
                - cell "HDFC Salary Account → Physical Cash Stash" [ref=e114]:
                  - text: HDFC Salary Account
                  - generic [ref=e115]: → Physical Cash Stash
                - cell "posted" [ref=e116]
                - cell "₹2,000.00" [ref=e118]
                - cell [ref=e120]:
                  - link "View details for ATM Cash Withdrawal" [ref=e121]:
                    - /url: /transactions/tx-2
          - generic [ref=e124]:
            - generic [ref=e125]: Showing 1 to 1 of 1 transactions
            - generic [ref=e126]:
              - button "Previous" [disabled]
              - generic [ref=e127]: Page 1 of 1
              - button "Next" [disabled]
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e133] [cursor=pointer]
  - alert [ref=e137]
```

# Test source

```ts
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
> 116 |       await expect(page.getByText("ATM Cash Withdrawal")).toBeVisible();
      |                                                           ^ Error: expect(locator).toBeVisible() failed
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
  160 |     }
  161 |   });
  162 | });
  163 | 
```