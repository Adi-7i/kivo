import { test, expect } from "@playwright/test";
import { openResource } from "./live-api";
import { decimalPaise } from "../src/features/finance/api";
import { formatInr } from "../src/lib/formatters/currency";

test.describe("Live People, Sharing and Rent", () => {
  test.setTimeout(60_000);
  const contact = () => process.env.KIVO_E2E_CONTACT_NAME_A!;
  const bill = () => process.env.KIVO_E2E_BILL_TITLE_A!;
  test("people uses actual contacts and authoritative relationship summaries", async ({ page }) => {
    await openResource(page, "/people", "/api/v1/contacts/");
    await expect(page.getByRole("heading", { name: "Friends & Contacts" })).toBeVisible();
    await expect(page.getByTestId("relationship-summary")).toContainText(
      "Receivables (all modules)"
    );
    await expect(
      page.getByText(contact(), { exact: true }).filter({ visible: true }).first()
    ).toBeVisible();
  });
  test("contact search has real matching and empty results", async ({ page }) => {
    await page.goto("/people");
    const search = page.getByPlaceholder(/Search contacts by name or notes/);
    await search.fill("no-such-contact-unique");
    await expect(page.getByRole("heading", { name: "No contacts found" })).toBeVisible();
    await search.fill(contact());
    await expect(
      page.getByText(contact(), { exact: true }).filter({ visible: true }).first()
    ).toBeVisible();
  });
  test("contact claim filters use actual receivable state", async ({ page }) => {
    await page.goto("/people");
    await page.getByRole("button", { name: "Owes You", exact: true }).click();
    await expect(
      page.getByText(contact(), { exact: true }).filter({ visible: true }).first()
    ).toBeVisible();
    await page.getByRole("button", { name: "You Owe", exact: true }).click();
    await expect(page.getByRole("heading", { name: "No contacts found" })).toBeVisible();
  });
  test("add contact displays real form without preview-success notices", async ({ page }) => {
    await page.goto("/people");
    await page.getByRole("button", { name: "Add Contact", exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "Add Personal Contact" })).toBeVisible();
    await expect(page.getByLabel(/Full Name or Nickname/)).toBeVisible();
    await expect(page.getByText("Contact Recorded in Frontend")).not.toBeVisible();
  });
  test("loan form preserves lending and borrowing classification", async ({ page }) => {
    await page.goto("/people");
    await page.getByRole("button", { name: "Lend", exact: true }).click();
    await expect(page.getByText("Lending is NOT personal spending", { exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "Borrow Money", exact: true }).click();
    await expect(page.getByText("Borrowing is NOT personal income", { exact: true })).toBeVisible();
  });
  test("real contact details include actual claims and history", async ({ page }) => {
    const id = process.env.KIVO_E2E_CONTACT_A!;
    await openResource(page, `/people/${id}`, `/api/v1/contacts/${id}/`);
    await expect(page.getByRole("heading", { name: contact(), exact: true })).toBeVisible();
    await expect(page.getByText("Money Owed to You (Receivable)", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Financial Claims" })).toBeVisible();
    await page.getByRole("button", { name: "Record Repayment", exact: true }).first().click();
    await expect(
      page.getByText("Repayment received is NOT fresh income", { exact: true })
    ).toBeVisible();
  });
  test("real shared list shows server bill and honestly scoped totals", async ({ page }) => {
    await page.goto("/shared-expenses");
    await expect(page.getByRole("heading", { name: "Shared Expenses & Bills" })).toBeVisible();
    await expect(
      page.getByText(bill(), { exact: true }).filter({ visible: true }).first()
    ).toBeVisible();
    await expect(page.getByText(/A sharing-only aggregate API is/)).toBeVisible();
  });
  test("bill search and status filters reflect actual unsettled claims", async ({ page }) => {
    await page.goto("/shared-expenses");
    await page.getByRole("button", { name: "Settled", exact: true }).click();
    await expect(page.getByRole("heading", { name: "No shared bills found" })).toBeVisible();
    await page.getByRole("button", { name: "Unsettled", exact: true }).click();
    await expect(
      page.getByText(bill(), { exact: true }).filter({ visible: true }).first()
    ).toBeVisible();
    await page.getByPlaceholder(/Search bills by title/).fill("no-such-bill-unique");
    await expect(page.getByRole("heading", { name: "No shared bills found" })).toBeVisible();
  });
  test("shared bill form delegates equal split and remainder to Django", async ({ page }) => {
    await page.goto("/shared-expenses");
    await page.getByRole("button", { name: "Create Shared Bill", exact: true }).first().click();
    await expect(page.getByLabel("Bill Title", { exact: true })).toBeVisible();
    await expect(
      page.getByText(/Equal shares and remainder paise are assigned by Django/)
    ).toBeVisible();
    await expect(page.getByRole("option", { name: contact(), exact: true })).toHaveCount(0);
    await expect(page.getByLabel(contact(), { exact: true })).toBeVisible();
  });
  test("actual shared UUID details display original shares and authoritative claims", async ({
    page,
  }) => {
    const id = process.env.KIVO_E2E_BILL_A!;
    await openResource(page, `/shared-expenses/${id}`, `/api/v1/shared-bills/${id}/`);
    await expect(page.getByRole("heading", { name: bill(), exact: true })).toBeVisible();
    await expect(page.getByText("Participant Shares Breakdown", { exact: true })).toBeVisible();
    await expect(page.getByTestId("share-owner")).toContainText("₹0.05");
    await expect(page.getByTestId(`share-${process.env.KIVO_E2E_CONTACT_A!}`)).toContainText(
      "Outstanding:"
    );
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
      await expect(
        page.getByRole("heading", { name: process.env.KIVO_E2E_RENT_NAME_A!, exact: true })
      ).toBeVisible();
      await expect(
        page.getByText(`Development landlord ${process.env.KIVO_E2E_RUN}`, { exact: true })
      ).toBeVisible();

      // Active Reserves List
      await expect(page.getByRole("heading", { name: "Rent Reserve Earmarks" })).toBeVisible();
      await expect(
        page.getByTestId(`rent-reserve-${process.env.KIVO_E2E_RENT_RESERVE_A}`)
      ).toContainText("₹0.05");

      // Monthly Obligations History
      await expect(page.getByRole("heading", { name: "Monthly Rent Obligations" })).toBeVisible();
      const capacity = await page.request.get("/api/v1/rent/spending-capacity/");
      expect(capacity.status()).toBe(200);
      const actual = await capacity.json();
      for (const [id, field] of [
        ["rent-liquid", "liquid_balance"],
        ["rent-reserved", "active_reserves"],
        ["rent-safe", "safe_to_spend"],
      ])
        await expect(page.getByTestId(id)).toContainText(formatInr(decimalPaise(actual[field])));
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

      // Validate input without mutating the shared regression fixture.
      await page
        .locator("#reserve-obligation")
        .selectOption(process.env.KIVO_E2E_RENT_OBLIGATION_A!);
      await page.getByLabel(/Reserve Label/i).fill("Invalid zero reserve");
      await page.getByLabel(/Amount to Protect/i).fill("0");
      await page.getByLabel(/Reason \/ Source/i).fill("Protected for month-end rent");

      // Submit
      await page.getByRole("button", { name: "Create Reserve" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByRole("dialog").getByText(/greater than zero/i)).toBeVisible();
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
      await expect(
        page.getByRole("heading", { name: "Configure Monthly Rent Plan" })
      ).toBeVisible();
      await expect(
        page
          .getByRole("dialog")
          .getByText(/Rent terms and participant shares are fixed after creation/)
      ).toBeVisible();
      await expect(page.getByLabel("Active Rent Plan", { exact: true })).toBeChecked();
      await expect(
        page.getByRole("button", { name: "Save Active Status", exact: true })
      ).toBeVisible();
    });

    test("opens Skip Obligation modal and checks auditable reason input", async ({ page }) => {
      await page.goto("/rent");

      const skipBtn = page
        .getByTestId(`rent-obligation-${process.env.KIVO_E2E_RENT_OBLIGATION_A}`)
        .getByRole("button", { name: "Skip", exact: true });
      await skipBtn.click();

      await expect(page.getByRole("heading", { name: "Skip Rent Obligation" })).toBeVisible();
      await expect(page.getByLabel(/Auditable Reason/i)).toBeVisible();
    });
  });

  test("rent obligation details and reserve history display actual audit records", async ({
    page,
  }) => {
    await page.goto("/rent");
    await page
      .getByTestId(`rent-obligation-${process.env.KIVO_E2E_RENT_OBLIGATION_A}`)
      .getByRole("button", { name: "Details & History", exact: true })
      .click();
    await expect(page.getByTestId("rent-obligation-details")).toContainText("₹0.10");
    await expect(page.getByText("No rent payments recorded.", { exact: true })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("button", { name: "View reserve history", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Identifiable rent regression fixture");
  });

  test("rent generation cutoff and filters retain actual obligation state", async ({ page }) => {
    await page.goto("/rent");
    await page.getByRole("button", { name: "Generate Obligations", exact: true }).click();
    await expect(
      page.getByRole("dialog").getByText(/due dates fall between the plan start/)
    ).toBeVisible();
    await expect(page.locator("#through-date")).toHaveAttribute("type", "date");
    await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
    await page.getByRole("button", { name: "Paid", exact: true }).click();
    await expect(
      page.getByTestId(`rent-obligation-${process.env.KIVO_E2E_RENT_OBLIGATION_A}`)
    ).not.toBeVisible();
    await page.getByRole("button", { name: "All Months", exact: true }).click();
    await expect(
      page.getByTestId(`rent-obligation-${process.env.KIVO_E2E_RENT_OBLIGATION_A}`)
    ).toBeVisible();
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
      await expect(
        page.getByTestId(`rent-reserve-${process.env.KIVO_E2E_RENT_RESERVE_A}`)
      ).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        376
      );
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
