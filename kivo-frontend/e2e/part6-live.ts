import { expect, type Page, type BrowserContext } from "@playwright/test";
import { rentHarness } from "./rent-live";
import { posted } from "./live-api";
import { confirmUiFinancial } from "./financial-ui";
import type { BudgetDTO } from "../src/features/budgets/api";
import type { SummaryDTO } from "../src/features/reports/api";
import type { EventDTO } from "../src/features/finance/api";

export async function part6Harness(page: Page, context: BrowserContext, opening = "10.00") {
  const f = await rentHarness(page, context, opening, "p6", "2022-01-01");
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  const nav = async (name: string) => {
    if (/^\/transactions\/[^/]+$/.test(new URL(page.url()).pathname))
      await page.getByRole("link", { name: "Back to Transactions", exact: true }).click();
    await page
      .locator('nav[aria-label="Application navigation"]')
      .getByRole("link", { name: new RegExp(name) })
      .first()
      .click();
  };
  const commit = async <T>(path: string, label: string, double = false): Promise<T> => {
    const title = await f.dialog().getByRole("heading").first().innerText();
    const modal = page.getByRole("dialog", { name: title, exact: true });
    const method = /^\/api\/v1\/budgets\/[^/]+\/$/.test(path) ? "PATCH" : "POST";
    const response = page.waitForResponse((r) => posted(r, path, method), { timeout: 60_000 });
    const button = modal.getByRole("button", { name: label, exact: true });
    if (double) await button.dblclick();
    else await button.click();
    const result = await confirmUiFinancial(page, await response, path);
    await expect(modal).not.toBeVisible();
    return result;
  };
  const budget = async (
    amount: string,
    category = false,
    custom?: { start: string; end: string }
  ) => {
    if (new URL(page.url()).pathname !== "/budgets") await page.goto("/budgets");
    await page
      .getByRole("button", {
        name: category ? "Add Category Budget" : "Set Monthly Budget",
        exact: true,
      })
      .click();
    await f
      .dialog()
      .locator("#budget-name")
      .fill(f.run + (category ? " Category" : " Overall") + (custom ? " Custom" : ""));
    if (category) await f.dialog().locator("#budget-category").selectOption(f.category.id);
    await f.dialog().locator("#budget-amount").fill(amount);
    await f.dialog().locator("#budget-warning").fill("50");
    if (custom) {
      await f.dialog().locator("#budget-period-type").selectOption("custom");
      await f.dialog().locator("#budget-start").fill(custom.start);
      await f.dialog().locator("#budget-end").fill(custom.end);
    }
    return f.commit<BudgetDTO>("/api/v1/budgets/", "Save Budget", true);
  };
  const progress = async (b: BudgetDTO, expected: Partial<BudgetDTO>) => {
    const result = await f.get<BudgetDTO>("budgets/" + b.id + "/");
    expect(result).toMatchObject(expected);
    const card = page.getByTestId("budget-card-" + b.id);
    await expect(card).toBeVisible();
    for (const [field, label] of [
      ["spent", "spent"],
      ["remaining", "budget-remaining"],
      ["overspending", "over-limit-by"],
    ] as const) {
      const formatted = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
      }).format(Number(result[field]));
      await expect(card.getByTestId("budget-" + label)).toHaveText(formatted);
    }
    await expect(card.getByRole("progressbar")).toHaveAttribute(
      "aria-valuetext",
      result.utilization_percent == null
        ? "Not defined for a zero limit"
        : result.utilization_percent + "%"
    );
    return result;
  };
  const expense = async (amount: string, title = f.run + " expense") => {
    await nav("Transactions");
    await page.getByRole("button", { name: "Quick Add", exact: true }).click();
    await f.dialog().locator("#expense-amount").fill(amount);
    await f.dialog().locator("#expense-title").fill(title);
    await f.dialog().locator("#expense-account").selectOption(f.account.id);
    await f.dialog().locator("#expense-category").selectOption(f.category.id);
    return f.commit<EventDTO>("/api/v1/transactions/", "Record Expense", true);
  };
  const report = async (params: Record<string, string> = { period: "month" }) => {
    const data = await f.get<SummaryDTO>("reports/summary/?" + new URLSearchParams(params));
    if (
      Object.keys(params).length === 1 &&
      params.period === "month" &&
      new URL(page.url()).pathname !== "/reports"
    )
      await nav("Reports & Analytics");
    else await page.goto("/reports?" + new URLSearchParams(params));
    await expect(page.getByTestId("report-expense")).toHaveText(
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
      }).format(Number(data.personal_expense))
    );
    await expect(page.getByTestId("report-income")).toHaveText(
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
      }).format(Number(data.external_income))
    );
    return data;
  };
  const correction = async (event: EventDTO, amount?: string) => {
    if (new URL(page.url()).pathname === "/reports") {
      await page.getByRole("link", { name: "View Filtered Transactions", exact: true }).click();
      await page
        .locator('a[href="/transactions/' + event.id + '"]')
        .first()
        .click();
    } else await page.goto("/transactions/" + event.id);
    await page
      .getByRole("button", { name: /Correct|Reverse|Actions|Manage/ })
      .first()
      .click();
    if (amount !== undefined)
      await f.dialog().getByRole("button", { name: "Correct", exact: true }).click();
    await f
      .dialog()
      .locator("#action-reason")
      .fill("Controlled Part 6 report and budget verification " + f.run);
    if (amount !== undefined)
      await f.dialog().getByLabel("Corrected amount", { exact: true }).fill(amount);
    const path =
      "/api/v1/transactions/" + event.id + (amount !== undefined ? "/correct/" : "/reverse/");
    const label = amount !== undefined ? "Save Correction" : "Execute Reversal";
    const response = page.waitForResponse((r) => posted(r, path), { timeout: 60_000 });
    await f.dialog().getByRole("button", { name: label, exact: true }).click();
    return confirmUiFinancial(page, await response, path) as Promise<EventDTO>;
  };
  const assertHealthy = () => {
    f.assertHealthy();
    expect(browserErrors, "No chart/application crash").toEqual([]);
  };
  return { ...f, assertHealthy, commit, nav, budget, progress, expense, report, correction };
}

/** Test-only RFC 4180 reader. Production downloads Django bytes without CSV reconstruction. */
export function csvRecords(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  text = text.replace(/^\ufeff/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const [header, ...data] = rows;
  return data
    .filter((r) => r.length === header.length)
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}
