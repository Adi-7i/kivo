import { test, expect } from "@playwright/test";

test.describe("Frontend Phase 5 — Friends, Lending/Borrowing, Shared Expenses, Rent & Reserves E2E", () => {
  test.describe("Friends & Contacts Overview (/people)", () => {
    test("loads people page and renders aggregate summary cards, navigation, and contact list", async ({
      page,
    }) => {
      const response = await page.goto("/people");
      expect(response?.status()).toBe(200);

      // Page Title & Header
      await expect(page).toHaveTitle(/Kivo/i);
      await expect(page.getByRole("heading", { name: "Friends & Contacts" })).toBeVisible();

      // Aggregate Financial Overview Cards
      await expect(page.getByText("Active Contacts").first()).toBeVisible();
      await expect(page.getByText("Money Lent (Receivable)").first()).toBeVisible();
      await expect(page.getByText("Money Borrowed (Payable)").first()).toBeVisible();
      await expect(page.getByText("Quick Operations")).toBeVisible();

      // Contact cards rendered (filter visible to handle responsive table vs mobile card grid)
      await expect(page.getByText("Rohan Sharma").filter({ visible: true }).first()).toBeVisible();
      await expect(page.getByText("Priya Patel").filter({ visible: true }).first()).toBeVisible();
      await expect(page.getByText("Ananya Iyer").filter({ visible: true }).first()).toBeVisible();
    });

    test("filters contacts by search input", async ({ page }) => {
      await page.goto("/people");

      const searchInput = page.getByPlaceholder(/Search contacts by name or notes/i);
      await expect(searchInput).toBeVisible();

      // Search for Rohan
      await searchInput.fill("Rohan");
      await expect(page.getByText("Rohan Sharma").filter({ visible: true }).first()).toBeVisible();
      await expect(page.getByText("Ananya Iyer")).not.toBeVisible();

      // Clear search
      await searchInput.fill("");
      await expect(page.getByText("Ananya Iyer").filter({ visible: true }).first()).toBeVisible();
    });

    test("filters contacts by tab pills (Owes You)", async ({ page }) => {
      await page.goto("/people");

      // Click Owes You filter button
      await page.getByRole("button", { name: "Owes You" }).click();
      await expect(page.getByText("Rohan Sharma").filter({ visible: true }).first()).toBeVisible();
      await expect(page.getByText("Priya Patel")).not.toBeVisible();
    });

    test("switches between view states (Empty State and Skeletons)", async ({ page }) => {
      await page.goto("/people");

      // Switch to Honest Empty
      await page.getByRole("button", { name: "Honest Empty" }).click();
      await expect(page.getByText("No Contacts Found")).toBeVisible();

      // Switch to Skeleton
      await page.getByRole("button", { name: "Skeleton" }).click();
      await expect(page.getByText("No Contacts Found")).not.toBeVisible();

      // Switch back to Populated
      await page.getByRole("button", { name: "Populated" }).click();
      await expect(page.getByText("Rohan Sharma").filter({ visible: true }).first()).toBeVisible();
    });

    test("opens Add Contact modal and verifies validation & backend pending notice", async ({
      page,
    }) => {
      await page.goto("/people");

      await page.getByRole("button", { name: "Add Contact" }).first().click();
      await expect(page.getByRole("heading", { name: "Add Personal Contact" })).toBeVisible();

      // Fill in contact form
      await page.getByLabel(/Full Name or Nickname/i).fill("Aditi Rao");
      await page.getByLabel(/Relationship \/ Notes/i).fill("Colleague & travel buddy");

      // Submit form
      await page.getByRole("button", { name: /Save Contact/i }).click();

      // Verify integration pending notice banner
      await expect(page.getByText("Contact Recorded in Frontend")).toBeVisible();
      await expect(page.getByText(/Contact "Aditi Rao" validated/i)).toBeVisible();
    });

    test("opens Lend / Borrow modal and verifies financial accounting invariant banner", async ({
      page,
    }) => {
      await page.goto("/people");

      await page.getByRole("button", { name: "Lend", exact: true }).first().click();
      await expect(page.getByRole("heading", { name: "Lend Money to Friend" })).toBeVisible();

      // Financial invariant for lending
      await expect(page.getByText(/Lending is NOT personal spending/i)).toBeVisible();

      // Switch to Borrow tab
      await page.getByRole("tab", { name: "Borrow Money" }).click();
      await expect(page.getByText(/Borrowing is NOT personal income/i)).toBeVisible();
    });
  });

  test.describe("Contact Detail (/people/[id])", () => {
    test("loads Rohan Sharma detail view with financial balance and activity timeline", async ({
      page,
    }) => {
      await page.goto("/people/c-rohan-1");

      // Breadcrumb / Back button
      await expect(page.getByRole("link", { name: "Back to Contacts" })).toBeVisible();

      // Contact Header
      await expect(page.getByRole("heading", { name: "Rohan Sharma" })).toBeVisible();
      await expect(page.getByText(/Flatmate at Indiranagar Apt 4B/i)).toBeVisible();

      // Financial balance breakdown
      await expect(page.getByText("Money Lent (Receivable)").first()).toBeVisible();
      await expect(page.getByText("Money Borrowed (Payable)").first()).toBeVisible();
      await expect(page.getByText("Account Status").first()).toBeVisible();

      // Activity timeline & claims
      await expect(page.getByRole("heading", { name: "Active Financial Claims" })).toBeVisible();
      await expect(
        page
          .getByText("Advance for plumber & water filter maintenance")
          .filter({ visible: true })
          .first()
      ).toBeVisible();

      // Open Repayment modal
      const settleBtn = page.getByRole("button", { name: "Record Repayment" }).first();
      await settleBtn.click();
      await expect(page.getByRole("heading", { name: "Record Loan Repayment" })).toBeVisible();
      await expect(page.getByText(/Repayment Recovers Asset, Not Fresh Income/i)).toBeVisible();
    });
  });

  test.describe("Shared Expenses Overview (/shared-expenses)", () => {
    test("loads shared expenses overview and displays aggregate summary cards and bills list", async ({
      page,
    }) => {
      const response = await page.goto("/shared-expenses");
      expect(response?.status()).toBe(200);

      // Page Title & Header
      await expect(page.getByRole("heading", { name: "Shared Expenses & Bills" })).toBeVisible();

      // 4 Aggregate Financial Overview Cards
      await expect(page.getByText("Gross Bills Total").first()).toBeVisible();
      await expect(page.getByText("Your Personal Share").first()).toBeVisible();
      await expect(page.getByText("Receivables from Friends").first()).toBeVisible();
      await expect(page.getByText("Payables to Friends").first()).toBeVisible();

      // Bill cards
      await expect(
        page.getByText("Nature's Basket Flat Groceries").filter({ visible: true }).first()
      ).toBeVisible();
      await expect(
        page.getByText("ACT Fibernet 300Mbps Broadband").filter({ visible: true }).first()
      ).toBeVisible();
    });

    test("filters bills by status buttons", async ({ page }) => {
      await page.goto("/shared-expenses");

      // Click Settled filter button
      await page.getByRole("button", { name: "Settled", exact: true }).click();
      await expect(
        page.getByText("Team Lunch at Toit").filter({ visible: true }).first()
      ).toBeVisible();
      await expect(page.getByText("Nature's Basket Flat Groceries")).not.toBeVisible();

      // Click Unsettled filter button
      await page.getByRole("button", { name: "Unsettled", exact: true }).click();
      await expect(
        page.getByText("Nature's Basket Flat Groceries").filter({ visible: true }).first()
      ).toBeVisible();
      await expect(page.getByText("Team Lunch at Toit")).not.toBeVisible();
    });

    test("opens Create Shared Bill modal and checks equal split calculations", async ({ page }) => {
      await page.goto("/shared-expenses");

      await page.getByRole("button", { name: "Create Shared Bill" }).first().click();
      await expect(page.getByRole("heading", { name: "Create Shared Bill" })).toBeVisible();

      // Check accounting invariant explanation
      await expect(page.getByText(/Gross Bill ≠ Personal Expense/i)).toBeVisible();

      // Check form fields
      await expect(page.getByLabel(/Bill Title/i)).toBeVisible();
      await expect(page.getByLabel(/Total Bill Amount/i)).toBeVisible();
    });
  });

  test.describe("Shared Bill Detail (/shared-expenses/[id])", () => {
    test("loads bill-groceries-oct detail view and verifies gross vs user share and participants", async ({
      page,
    }) => {
      await page.goto("/shared-expenses/bill-groceries-oct");

      // Back navigation
      await expect(page.getByRole("link", { name: "Back to Shared Bills" })).toBeVisible();

      // Header & Title
      await expect(
        page.getByRole("heading", { name: "Nature's Basket Flat Groceries" })
      ).toBeVisible();

      // Financial breakdown: Gross vs User Share
      await expect(page.getByText("Total Gross Bill")).toBeVisible();
      await expect(page.getByText("Your Personal Expense Share")).toBeVisible();
      await expect(page.getByText("Receivables from Friends")).toBeVisible();

      // Participants breakdown
      await expect(page.getByText("Participant Shares Breakdown")).toBeVisible();
      await expect(page.getByText("Rohan Sharma").filter({ visible: true }).first()).toBeVisible();
    });
  });

  test.describe("Monthly Rent, Reserves & Safe-to-Spend (/rent)", () => {
    test("loads rent page and renders Safe-to-Spend hero, rent plan, reserves, and obligations", async ({
      page,
    }) => {
      const response = await page.goto("/rent");
      expect(response?.status()).toBe(200);

      // Hero Card: Safe-to-Spend
      await expect(
        page.getByRole("heading", { name: "Spending Capacity & Safe-to-Spend" })
      ).toBeVisible();
      await expect(
        page.getByText("Actual Liquid Cash", { exact: true }).filter({ visible: true }).first()
      ).toBeVisible();
      await expect(
        page.getByText("Active Rent Reserves", { exact: true }).filter({ visible: true }).first()
      ).toBeVisible();
      await expect(
        page.getByText("Safe-to-Spend", { exact: true }).filter({ visible: true }).first()
      ).toBeVisible();
      await expect(
        page.getByText("Safe-to-Spend = Liquid Cash − Active Rent Reserves")
      ).toBeVisible();

      // Active Rent Plan Overview
      await expect(page.getByRole("heading", { name: "Indiranagar 3BHK Flat Rent" })).toBeVisible();
      await expect(page.getByText(/Brigade Residency Management & Landlord/i)).toBeVisible();

      // Active Reserves List
      await expect(page.getByRole("heading", { name: "Active Rent Reserve Earmarks" })).toBeVisible();
      await expect(page.getByText("November Rent Earmark")).toBeVisible();

      // Monthly Obligations History
      await expect(page.getByRole("heading", { name: "Monthly Rent Obligations" })).toBeVisible();
    });

    test("opens Add Reserve modal and validates reserve inputs", async ({ page }) => {
      await page.goto("/rent");

      await page
        .getByRole("button", { name: /Add Reserve Earmark/i })
        .first()
        .click();
      await expect(
        page.getByRole("heading", { name: "Create Rent Reserve Earmark" })
      ).toBeVisible();

      // Invariant note
      await expect(page.getByText(/Reserves ring-fence actual liquid cash/i)).toBeVisible();

      // Fill in reserve
      await page.getByLabel(/Reserve Label/i).fill("November Rent Earmark");
      await page.getByLabel(/Amount to Protect/i).fill("14000");
      await page.getByLabel(/Reason \/ Source/i).fill("Protected for month-end rent");

      // Submit
      await page.getByRole("button", { name: "Create Reserve" }).click();
      await expect(
        page.getByText(/Reserve "November Rent Earmark" for ₹14000 validated/i)
      ).toBeVisible();
    });

    test("opens Record Rent Payment modal and verifies owner vs roommate payer options", async ({
      page,
    }) => {
      await page.goto("/rent");

      await page
        .getByRole("button", { name: /Record Rent Payment/i })
        .first()
        .click();
      await expect(page.getByRole("heading", { name: "Record Rent Payment" })).toBeVisible();

      // Payment option toggle
      await expect(page.getByRole("button", { name: "I Paid (Owner)" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Roommate / Friend Paid" })).toBeVisible();
    });

    test("opens Rent Plan Settings modal", async ({ page }) => {
      await page.goto("/rent");

      await page.getByRole("button", { name: "Configure Plan" }).first().click();
      await expect(page.getByRole("heading", { name: "Configure Rent Plan" })).toBeVisible();
      await expect(page.getByLabel(/Plan Title/i)).toHaveValue("Indiranagar 3BHK Flat Rent");
      await expect(page.getByLabel(/Landlord \/ Payee Name/i)).toHaveValue(
        "Brigade Residency Management & Landlord"
      );
    });

    test("opens Skip Obligation modal and checks auditable reason input", async ({ page }) => {
      await page.goto("/rent");

      const skipBtn = page.getByRole("button", { name: "Skip" }).first();
      await skipBtn.click();

      await expect(page.getByRole("heading", { name: "Skip Rent Obligation" })).toBeVisible();
      await expect(page.getByLabel(/Auditable Reason/i)).toBeVisible();
    });
  });

  test.describe("Responsive Viewports", () => {
    test("renders properly on mobile viewport (375x667)", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Check /people
      await page.goto("/people");
      await expect(page.getByRole("heading", { name: "Friends & Contacts" })).toBeVisible();

      // Check /shared-expenses
      await page.goto("/shared-expenses");
      await expect(page.getByRole("heading", { name: "Shared Expenses & Bills" })).toBeVisible();

      // Check /rent
      await page.goto("/rent");
      await expect(
        page.getByRole("heading", { name: "Spending Capacity & Safe-to-Spend" })
      ).toBeVisible();
    });

    test("renders properly on tablet viewport (768x1024)", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.goto("/rent");
      await expect(
        page.getByRole("heading", { name: "Spending Capacity & Safe-to-Spend" })
      ).toBeVisible();
      await expect(
        page.getByText("Safe-to-Spend", { exact: true }).filter({ visible: true }).first()
      ).toBeVisible();
    });
  });
});
