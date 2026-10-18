# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase3.spec.ts >> Frontend Phase 3 — Financial Dashboard, Money Accounts & Transactions E2E >> Responsive Viewports Check (Zero Horizontal Scroll) >> renders /transactions/tx-1 cleanly on tablet (768px) without horizontal overflow
- Location: e2e/phase3.spec.ts:151:13

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/transactions/tx-1
Call log:
  - navigating to "http://localhost:3000/transactions/tx-1", waiting until "load"

```

# Test source

```ts
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
> 153 |           await page.goto(route);
      |                      ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/transactions/tx-1
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