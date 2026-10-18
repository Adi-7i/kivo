# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: phase3.spec.ts >> Frontend Phase 3 — Financial Dashboard, Money Accounts & Transactions E2E >> Transaction Detail (/transactions/[id]) >> renders full ledger event attributes and double-entry postings
- Location: e2e/phase3.spec.ts:122:9

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('HDFC Salary Account')
Expected: visible
Error: strict mode violation: getByText('HDFC Salary Account') resolved to 2 elements:
    1) <p class="font-semibold text-foreground text-sm">HDFC Salary Account</p> aka getByRole('paragraph').filter({ hasText: 'HDFC Salary Account' })
    2) <span class="font-semibold text-foreground">HDFC Salary Account</span> aka locator('span').filter({ hasText: 'HDFC Salary Account' })

Call log:
  - Expect "toBeVisible" getByText('HDFC Salary Account') with timeout 5000ms
  - waiting for getByText('HDFC Salary Account')

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
    - generic [ref=e17]:
      - generic [ref=e18]:
        - link "Back to Transactions" [ref=e19] [cursor=pointer]:
          - /url: /transactions
        - generic [ref=e23]: "Status: posted"
      - generic [ref=e24]:
        - generic [ref=e26]:
          - generic [ref=e27]:
            - generic [ref=e28]:
              - generic [ref=e29]: Personal Expense
              - generic [ref=e31]: "Ref #tx-1"
            - generic [ref=e32]: Zepto Quick Groceries
          - generic [ref=e33]:
            - generic [ref=e34]: Total Amount
            - generic [ref=e35]: +₹450.00
        - generic [ref=e36]:
          - generic [ref=e37]:
            - generic [ref=e38]:
              - generic [ref=e39]: Effective Date
              - paragraph [ref=e42]: 17 Oct 2026
            - generic [ref=e43]:
              - generic [ref=e44]: Account
              - paragraph [ref=e49]: HDFC Salary Account
            - generic [ref=e50]:
              - generic [ref=e51]: Category
              - paragraph [ref=e55]: Food & Groceries
            - generic [ref=e56]:
              - generic [ref=e57]: Merchant / Payee
              - paragraph [ref=e62]: Zepto
            - generic [ref=e63]:
              - generic [ref=e64]: Payment Method
              - paragraph [ref=e67]: UPI
          - generic [ref=e68]:
            - generic [ref=e69]: Notes & Memorandum
            - paragraph [ref=e73]: Breakfast fruits and almond milk
          - generic [ref=e74]:
            - heading "Ledger Postings Breakdown" [level=3] [ref=e80]
            - paragraph [ref=e81]: "Every financial event produces balanced double-entry ledger legs in the immutable database:"
            - generic [ref=e82]:
              - generic [ref=e83]:
                - generic [ref=e84]:
                  - text: HDFC Salary Account
                  - generic [ref=e85]: "Leg 1: Asset Balance Adjustment"
                - generic [ref=e86]:
                  - generic [ref=e87]: CREDIT
                  - generic [ref=e88]: ₹450.00
              - generic [ref=e89]:
                - generic [ref=e90]:
                  - text: Food & Groceries
                  - generic [ref=e91]: "Leg 2: Balancing Ledger Leg"
                - generic [ref=e92]:
                  - generic [ref=e93]: DEBIT
                  - generic [ref=e94]: ₹450.00
          - generic [ref=e95]:
            - generic [ref=e96]: Immutable Ledger Entry • Append-only architecture
            - button "Record Reversal / Correction" [ref=e101]
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e108] [cursor=pointer]
  - alert [ref=e112]
```

# Test source

```ts
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
  118 |     });
  119 |   });
  120 | 
  121 |   test.describe("Transaction Detail (/transactions/[id])", () => {
  122 |     test("renders full ledger event attributes and double-entry postings", async ({ page }) => {
  123 |       await page.goto("/transactions/tx-1");
  124 | 
  125 |       await expect(page.getByText("Zepto Quick Groceries")).toBeVisible();
  126 |       await expect(page.getByText("Effective Date")).toBeVisible();
> 127 |       await expect(page.getByText("HDFC Salary Account")).toBeVisible();
      |                                                           ^ Error: expect(locator).toBeVisible() failed
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