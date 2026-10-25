import { test, expect } from "@playwright/test";
import { openResource } from "./live-api";

test.describe("Real funding source screens (Django-backed; not preview fixtures)", () => {
  test("lists actual owned opening equity and never labels capacity as cash", async ({ page }) => {
    await page.goto("/money/sources");
    await expect(page.getByRole("heading", { name: "Money Sources & Fund Journey" })).toBeVisible();
    await expect(
      page
        .getByText(process.env.KIVO_E2E_FUND_NAME_A!, { exact: true })
        .filter({ visible: true })
        .first()
    ).toBeVisible();
    await expect(
      page.getByText("FIFO is Django accounting attribution", { exact: false })
    ).toBeVisible();
    await expect(
      page.getByText("₹123.45", { exact: true }).filter({ visible: true }).first()
    ).toBeVisible();
  });
  test("searches the complete pinned source collection and presents honest no-match state", async ({
    page,
  }) => {
    await page.goto("/money/sources");
    await page.getByLabel("Search money sources").fill("NoSuchSourceUnique");
    await expect(page.getByText("No Funding Sources Found", { exact: true })).toBeVisible();
    await page.getByLabel("Search money sources").fill("Opening");
    await expect(
      page
        .getByText(process.env.KIVO_E2E_FUND_NAME_A!, { exact: true })
        .filter({ visible: true })
        .first()
    ).toBeVisible();
  });
  test("filters actual attribution state without invented exhaustion", async ({ page }) => {
    await page.goto("/money/sources");
    await page.getByLabel("Filter attribution state").selectOption("exhausted");
    await expect(page.getByText("No Funding Sources Found", { exact: true })).toBeVisible();
    await page.getByLabel("Filter attribution state").selectOption("active");
    await expect(
      page
        .getByText(process.env.KIVO_E2E_FUND_NAME_A!, { exact: true })
        .filter({ visible: true })
        .first()
    ).toBeVisible();
  });
  test("sorts actual owned funding rows without making a financial total", async ({ page }) => {
    await page.goto("/money/sources");
    await page.getByLabel("Sort money sources").selectOption("highest");
    await expect(
      page
        .getByText(process.env.KIVO_E2E_FUND_NAME_A!, { exact: true })
        .filter({ visible: true })
        .first()
    ).toBeVisible();
  });
  test("loads an actual batch UUID and its pinned positions/journey", async ({ page }) => {
    await openResource(
      page,
      `/money/sources/${process.env.KIVO_E2E_FUND_A}`,
      `/api/v1/funds/batches/${process.env.KIVO_E2E_FUND_A}/`
    );
    await expect(page.getByText("Chronological Fund Journey", { exact: true })).toBeVisible();
    await expect(page.getByText("Attributed Holdings", { exact: true })).toBeVisible();
    await expect(page.getByText(/Snapshot:/)).toBeVisible();
    await expect(page.getByText(/inclusive calendar days/)).not.toBeVisible();
  });
  test("missing owned UUID produces the actual API error, never a preview fallback", async ({
    page,
  }) => {
    await page.goto("/money/sources/00000000-0000-4000-8000-000000000099");
    await expect(page.getByRole("alert").last()).toBeVisible();
    await expect(page.getByText("Attributed Holdings", { exact: true })).not.toBeVisible();
  });
  for (const width of [375, 768, 1440]) {
    for (const detail of [false, true]) {
      test(`real ${detail ? "detail" : "list"} has no horizontal overflow at ${width}px`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(
          detail ? `/money/sources/${process.env.KIVO_E2E_FUND_A}` : "/money/sources"
        );
        await expect(
          page
            .getByText(detail ? "Attributed Holdings" : "Money Sources & Fund Journey", {
              exact: true,
            })
            .first()
        ).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth
          )
        ).toBeLessThanOrEqual(1);
      });
    }
  }
});
