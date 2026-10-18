# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase3.spec.ts >> Frontend Phase 3 — Financial Dashboard, Money Accounts & Transactions E2E >> Financial Dashboard (/dashboard) >> loads dashboard and renders overview header, 8 summary cards and quick actions
- Location: e2e/phase3.spec.ts:5:9

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Safe-to-Spend')
Expected: visible
Error: strict mode violation: getByText('Safe-to-Spend') resolved to 2 elements:
    1) <span class="text-[11px] text-muted-foreground">Total Balance ≠ Safe-to-Spend</span> aka getByText('Total Balance ≠ Safe-to-Spend')
    2) <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Safe-to-Spend</span> aka getByText('Safe-to-Spend', { exact: true })

Call log:
  - Expect "toBeVisible" getByText('Safe-to-Spend') with timeout 5000ms
  - waiting for getByText('Safe-to-Spend')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
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
        - alert [ref=e53]:
          - generic [ref=e56]: Financial Dashboard Architecture (Phase 3)
          - generic [ref=e57]: Demonstrating 8 distinct summary metrics, Recharts daily spending analytics, category distributions, and the accessible Quick Add transaction modal. All values operate under integer paise invariants.
        - generic [ref=e58]:
          - generic [ref=e59]:
            - generic [ref=e60]:
              - heading "Personal Workspace" [level=1] [ref=e61]
              - generic [ref=e62]: Phase 3
            - generic [ref=e63]:
              - generic [ref=e64]: Saturday, 17 October 2026
              - generic [ref=e68]: •
              - generic [ref=e69]: Integer Paise • IST (UTC+05:30)
          - button "Quick Add" [ref=e75]
        - generic [ref=e77]:
          - button "Add Expense" [ref=e78]
          - button "Money Received" [ref=e80]
          - button "Transfer" [ref=e82]
          - link "Full History" [ref=e84] [cursor=pointer]:
            - /url: /transactions
        - generic [ref=e86]:
          - generic [ref=e87]:
            - heading "Financial Position Summary" [level=2] [ref=e88]
            - generic [ref=e89]: Total Balance ≠ Safe-to-Spend
          - generic [ref=e90]:
            - generic [ref=e92]:
              - generic [ref=e93]: Total Liquid Balance
              - generic [ref=e99]:
                - generic [ref=e100]: ₹53,250.00
                - paragraph [ref=e101]: All active cash, bank & wallet balances
            - generic [ref=e103]:
              - generic [ref=e104]: Safe-to-Spend
              - generic [ref=e110]:
                - generic [ref=e111]: ₹38,250.00
                - paragraph [ref=e112]: Liquid funds minus reserved obligations
            - generic [ref=e114]:
              - generic [ref=e115]: Today's Expenses
              - generic [ref=e121]:
                - generic [ref=e122]: ₹450.00
                - paragraph [ref=e123]: Expenditures on current calendar date
            - generic [ref=e125]:
              - generic [ref=e126]: Monthly Expenses
              - generic [ref=e131]:
                - generic [ref=e132]: ₹14,500.00
                - paragraph [ref=e133]: Total personal expenses this month
            - generic [ref=e135]:
              - generic [ref=e136]: Money Received
              - generic [ref=e142]:
                - generic [ref=e143]: ₹75,000.00
                - paragraph [ref=e144]: Income & external inflows this month
            - generic [ref=e146]:
              - generic [ref=e147]: Owed to You (Asset)
              - generic [ref=e156]:
                - generic [ref=e157]: ₹5,000.00
                - paragraph [ref=e158]: Receivables from loans given to friends
            - generic [ref=e160]:
              - generic [ref=e161]: Owed by You (Liability)
              - generic [ref=e167]:
                - generic [ref=e168]: ₹2,000.00
                - paragraph [ref=e169]: Payables from borrowed funds
            - generic [ref=e171]:
              - generic [ref=e172]: Reserved Obligations
              - generic [ref=e178]:
                - generic [ref=e179]: ₹15,000.00
                - paragraph [ref=e180]: Earmarked for upcoming fixed expenses
        - generic [ref=e181]:
          - generic [ref=e182]:
            - generic [ref=e183]:
              - generic [ref=e184]:
                - generic [ref=e185]: Daily Spending Trend
                - generic [ref=e186]: Calendar-faithful expenditures across active ledger accounts.
              - generic [ref=e187]:
                - button "Last 7 Days" [ref=e188]
                - button "Last 30 Days" [ref=e189]
            - table [ref=e194]:
              - caption [ref=e195]: Daily Spending Summary
              - rowgroup [ref=e196]:
                - row [ref=e197]:
                  - columnheader "Date" [ref=e198]
                  - columnheader "Expense Amount" [ref=e199]
              - rowgroup [ref=e200]:
                - row [ref=e201]:
                  - cell "2026-10-11" [ref=e202]
                  - cell "₹1,200.00" [ref=e203]
                - row [ref=e204]:
                  - cell "2026-10-12" [ref=e205]
                  - cell "₹850.00" [ref=e206]
                - row [ref=e207]:
                  - cell "2026-10-13" [ref=e208]
                  - cell "₹2,400.00" [ref=e209]
                - row [ref=e210]:
                  - cell "2026-10-14" [ref=e211]
                  - cell "₹650.00" [ref=e212]
                - row [ref=e213]:
                  - cell "2026-10-15" [ref=e214]
                  - cell "₹1,900.00" [ref=e215]
                - row [ref=e216]:
                  - cell "2026-10-16" [ref=e217]
                  - cell "₹3,100.00" [ref=e218]
                - row [ref=e219]:
                  - cell "2026-10-17" [ref=e220]
                  - cell "₹450.00" [ref=e221]
          - generic [ref=e222]:
            - generic [ref=e223]:
              - generic [ref=e224]: Expense by Category
              - generic [ref=e225]: Monthly expenditure distribution by classification.
            - generic [ref=e226]:
              - generic [ref=e228]:
                - generic [ref=e229]: Food & Groceries
                - generic [ref=e230]:
                  - generic [ref=e231]: 43%
                  - generic [ref=e232]: ₹6,200.00
              - generic [ref=e236]:
                - generic [ref=e237]: Utilities & Bills
                - generic [ref=e238]:
                  - generic [ref=e239]: 24%
                  - generic [ref=e240]: ₹3,500.00
              - generic [ref=e244]:
                - generic [ref=e245]: Transit & Fuel
                - generic [ref=e246]:
                  - generic [ref=e247]: 17%
                  - generic [ref=e248]: ₹2,400.00
              - generic [ref=e252]:
                - generic [ref=e253]: Entertainment
                - generic [ref=e254]:
                  - generic [ref=e255]: 10%
                  - generic [ref=e256]: ₹1,500.00
              - generic [ref=e260]:
                - generic [ref=e261]: Other
                - generic [ref=e262]:
                  - generic [ref=e263]: 6%
                  - generic [ref=e264]: ₹900.00
        - generic [ref=e267]:
          - generic [ref=e268]:
            - generic [ref=e269]:
              - generic [ref=e270]:
                - generic [ref=e271]: Money Repositories
                - generic [ref=e272]: Current balances across your owned accounts.
              - link "Manage" [ref=e273] [cursor=pointer]:
                - /url: /money
            - generic [ref=e277]:
              - generic [ref=e278]:
                - generic [ref=e279]: HDFC Salary Account
                - generic [ref=e286]: ₹48,500.00
              - generic [ref=e287]:
                - generic [ref=e288]: Physical Cash Stash
                - generic [ref=e294]: ₹3,500.00
              - generic [ref=e295]:
                - generic [ref=e296]: Amazon Pay Wallet
                - generic [ref=e302]: ₹1,250.00
          - generic [ref=e303]:
            - generic [ref=e304]:
              - generic [ref=e305]:
                - generic [ref=e306]: Recent Activity
                - generic [ref=e307]: Latest chronological events recorded in your ledger.
              - link "View all" [ref=e308] [cursor=pointer]:
                - /url: /transactions
            - generic [ref=e313]:
              - generic [ref=e314]:
                - generic [ref=e315]:
                  - generic [ref=e316]: Personal Expense
                  - generic [ref=e318]:
                    - paragraph [ref=e319]: Zepto Quick Groceries
                    - paragraph [ref=e320]: HDFC Salary Account • Food & Groceries • 17 Oct 2026
                - generic [ref=e321]: +₹450.00
              - generic [ref=e323]:
                - generic [ref=e324]:
                  - generic [ref=e325]: Own Transfer
                  - generic [ref=e327]:
                    - paragraph [ref=e328]: ATM Cash Withdrawal
                    - paragraph [ref=e329]: HDFC Salary Account • 16 Oct 2026
                - generic [ref=e330]: ₹2,000.00
              - generic [ref=e332]:
                - generic [ref=e333]:
                  - generic [ref=e334]: Money Received
                  - generic [ref=e336]:
                    - paragraph [ref=e337]: Freelance Design Retainer
                    - paragraph [ref=e338]: HDFC Salary Account • 15 Oct 2026
                - generic [ref=e339]: +₹5,000.00
              - generic [ref=e341]:
                - generic [ref=e342]:
                  - generic [ref=e343]: Personal Expense
                  - generic [ref=e345]:
                    - paragraph [ref=e346]: Electricity & Water Bill
                    - paragraph [ref=e347]: HDFC Salary Account • Utilities & Bills • 15 Oct 2026
                - generic [ref=e348]: +₹1,900.00
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e355] [cursor=pointer]
  - alert [ref=e359]
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
> 17  |       await expect(page.getByText("Safe-to-Spend")).toBeVisible();
      |                                                     ^ Error: expect(locator).toBeVisible() failed
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
  116 |       await expect(page.getByText("ATM Cash Withdrawal")).toBeVisible();
  117 |       await expect(page.getByText("Zepto Quick Groceries")).not.toBeVisible();
```