import { expect, type BrowserContext, type Page } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { authPost, backendOrigin, frontendOrigin, posted } from "./live-api";
import { confirmUiFinancial } from "./financial-ui";
import { todayInKolkata } from "../src/features/onboarding/money";
import { decimalPaise, type AccountDTO } from "../src/features/finance/api";
import { formatInr } from "../src/lib/formatters/currency";
import type { DashboardDTO } from "../src/features/dashboard/api";
import type {
  PlanDTO,
  ObligationDTO,
  PaymentDTO,
  ReserveDTO,
  CapacityDTO,
} from "../src/features/rent/api";

/** Real owned Django fixtures/oracles; these never access financial SQL or retry POSTs. */
export async function rentHarness(
  page: Page,
  context: BrowserContext,
  opening = "10.00",
  prefix = "p5",
  openedOn?: string
) {
  const run = prefix + "-" + Date.now() + "-" + randomUUID().slice(0, 5),
    date = todayInKolkata();
  const email = "kivo-" + run + "@example.test",
    password = randomBytes(24).toString("base64url") + "!a7",
    api = context.request;
  expect(
    (await authPost(api, "/api/v1/auth/register/", { name: run, email, password })).status()
  ).toBe(201);
  expect((await authPost(api, "/api/v1/auth/login/", { email, password })).status()).toBe(200);
  const headers = async (key: string = randomUUID()) => {
    const cookies = await context.cookies();
    return {
      Origin: frontendOrigin,
      "X-CSRFToken": cookies.find((c) => c.name === "csrftoken")!.value,
      "Idempotency-Key": key,
      Cookie: cookies
        .filter((c) => ["sessionid", "csrftoken"].includes(c.name))
        .map((c) => c.name + "=" + c.value)
        .join("; "),
    };
  };
  const get = async <T>(path: string): Promise<T> => {
    const response = await api.get(backendOrigin + "/api/v1/" + path, {
      headers: await headers(),
      timeout: 60_000,
    });
    expect(response.status()).toBe(200);
    return response.json();
  };
  const fixture = async <T>(path: string, body: object): Promise<T> => {
    const response = await api.post(backendOrigin + "/api/v1/" + path, {
      headers: await headers(),
      data: body,
      timeout: 60_000,
    });
    expect(response.status(), "Unconfirmed fixture; never automatically replay writes").toBe(201);
    return response.json();
  };
  const account = await fixture<AccountDTO>("accounts/", {
    name: run + " Bank",
    kind: "bank",
    opened_on: openedOn ?? date,
    opening_balance: opening,
  });
  const contact = await fixture<{ id: string; display_name: string }>("contacts/", {
    display_name: run + " Friend",
    is_roommate: true,
  });
  const category = await fixture<{ id: string }>("categories/", { name: run + " Rent" });
  const unavailable: { path: string; status: number }[] = [];
  page.on("response", (r) => {
    if (r.url().startsWith(frontendOrigin) && r.status() >= 500)
      unavailable.push({ path: new URL(r.url()).pathname, status: r.status() });
  });
  const dialog = () => page.getByRole("dialog").last();
  const commit = async <T>(path: string, label: string, double = false): Promise<T> => {
    // Keep the submitted dialog identity: after it closes, .last() would resolve
    // to its parent, which may legitimately offer another repayment button.
    const title = await dialog().getByRole("heading").first().innerText();
    const submittedDialog = page.getByRole("dialog", { name: title, exact: true });
    const response = page.waitForResponse((r) => posted(r, path), { timeout: 60_000 });
    const button = submittedDialog.getByRole("button", { name: label, exact: true });
    if (double) await button.dblclick();
    else await button.click();
    const result = await confirmUiFinancial(page, await response, path);
    await expect(submittedDialog).not.toBeVisible();
    return result;
  };
  const createPlan = async (
    amount: string,
    options: {
      start?: string;
      day?: number | null;
      shared?: boolean;
      title?: string;
      custom?: { owner: string; friend: string };
    } = {}
  ) => {
    if (new URL(page.url()).pathname !== "/rent") await page.goto("/rent");
    await page.getByRole("button", { name: "Create Rent Plan", exact: true }).click();
    await dialog()
      .locator("#plan-title")
      .fill(options.title ?? run + " Plan");
    await dialog()
      .locator("#plan-payee")
      .fill(run + " Landlord");
    await dialog().locator("#plan-amount").fill(amount);
    await dialog()
      .locator("#plan-start")
      .fill(options.start ?? date.slice(0, 7) + "-01");
    await dialog().locator("#plan-category").selectOption(category.id);
    if (options.day != null) {
      await dialog().getByRole("button", { name: "Fixed Day of Month", exact: true }).click();
      await dialog().locator("#plan-day").fill(String(options.day));
    }
    if (options.shared) {
      await dialog()
        .getByLabel("This is a Shared Rent Plan with Flatmates", { exact: true })
        .check();
      await dialog().getByLabel(contact.display_name, { exact: true }).check();
      if (options.custom) {
        await dialog().locator("#plan-split").selectOption("custom");
        await dialog().locator("#plan-owner-share").fill(options.custom.owner);
        await dialog()
          .locator("#plan-share-" + contact.id)
          .fill(options.custom.friend);
      }
    }
    const plan = await commit<PlanDTO>("/api/v1/rent/plans/", "Create Rent Plan", true);
    await page.locator("#rent-plan-select").selectOption(plan.id);
    return plan;
  };
  const monthEnd = new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0))
    .toISOString()
    .slice(0, 10);
  const generate = async (plan: PlanDTO, through = monthEnd) => {
    await page.locator("#rent-plan-select").selectOption(plan.id);
    await page.getByRole("button", { name: "Generate Obligations", exact: true }).click();
    await dialog().locator("#through-date").fill(through);
    const result = await commit<PlanDTO>(
      "/api/v1/rent/plans/" + plan.id + "/generate/",
      "Generate Obligations"
    );
    expect(result.id).toBe(plan.id);
    return get<{ count: number; results: ObligationDTO[] }>(
      "rent/plans/" + plan.id + "/obligations/"
    );
  };
  const reserve = async (obligation: ObligationDTO, amount: string) => {
    await page.getByRole("button", { name: "New Reserve", exact: true }).click();
    await dialog().locator("#reserve-obligation").selectOption(obligation.id);
    await dialog()
      .locator("#reserve-label")
      .fill(run + " Reserve");
    await dialog().locator("#reserve-amount").fill(amount);
    await dialog()
      .locator("#reserve-reason")
      .fill("Identifiable development rent protection " + run);
    return commit<ReserveDTO>("/api/v1/rent/reserves/", "Create Reserve", true);
  };
  const openPay = async (obligation: ObligationDTO, amount: string, friend = false) => {
    await page
      .getByTestId("rent-obligation-" + obligation.id)
      .getByRole("button", { name: "Pay", exact: true })
      .click();
    if (friend) {
      await dialog().getByRole("button", { name: "Roommate / Friend Paid", exact: true }).click();
      await dialog().locator("#payment-friend").selectOption(contact.id);
    } else await dialog().locator("#payment-account").selectOption(account.id);
    await dialog().locator("#payment-amount").fill(amount);
    await dialog().locator("#payment-date").fill(date);
    await dialog()
      .locator("#payment-notes")
      .fill("Controlled actual rent posting " + run);
  };
  const pay = async (obligation: ObligationDTO, amount: string, friend = false) => {
    await openPay(obligation, amount, friend);
    return commit<PaymentDTO>(
      "/api/v1/rent/obligations/" + obligation.id + "/payments/",
      "Record Payment"
    );
  };
  const details = async (obligation: ObligationDTO) => {
    await page
      .getByTestId("rent-obligation-" + obligation.id)
      .getByRole("button", { name: "Details & History", exact: true })
      .click();
    await expect(page.getByTestId("rent-obligation-details")).toBeVisible();
  };
  const closeDetails = async () => {
    await page
      .getByRole("dialog", { name: "Rent Obligation Details & History", exact: true })
      .getByRole("button", { name: "Close", exact: true })
      .click();
  };
  const repay = async (obligation: ObligationDTO, claim: string, amount: string) => {
    await details(obligation);
    const card = page.getByTestId("claim-" + claim);
    await card.getByRole("button", { name: /Pay Back|Record Repayment/ }).click();
    await dialog().locator("#settlement-account").selectOption(account.id);
    await dialog().locator("#settlement-amount").fill(amount);
    await dialog()
      .locator("#settlement-title")
      .fill("Rent claim settlement " + run);
    const result = await commit<{ id: string; kind: string }>(
      "/api/v1/settlements/",
      "Record Repayment"
    );
    await closeDetails();
    return result;
  };
  const capacity = async (
    cash: string,
    reserved: string,
    safe: string,
    expense: string,
    payable = "0.00",
    receivable = "0.00"
  ) => {
    expect(await get<CapacityDTO>("rent/spending-capacity/")).toEqual({
      liquid_balance: cash,
      active_reserves: reserved,
      safe_to_spend: safe,
    });
    expect(await get<DashboardDTO>("dashboard/?period=month")).toMatchObject({
      liquid_balance: cash,
      reserved,
      safe_to_spend: safe,
      payables: payable,
      receivables: receivable,
      selected_period: { external_income: "0.00", personal_expense: expense },
    });
    expect((await get<AccountDTO>("accounts/" + account.id + "/")).balance).toBe(cash);
    if (
      new URL(page.url()).pathname === "/rent" &&
      (await page.getByRole("dialog").count()) === 0
    ) {
      for (const [id, value] of [
        ["rent-liquid", cash],
        ["rent-reserved", reserved],
        ["rent-safe", safe],
      ])
        await expect(page.getByTestId(id)).toContainText(formatInr(decimalPaise(value)));
    }
  };
  const correct = async (obligation: ObligationDTO, payment: PaymentDTO, amount: string) => {
    await details(obligation);
    await page
      .getByTestId("rent-payment-" + payment.id)
      .getByRole("button", { name: "Correct Rent Payment", exact: true })
      .click();
    await dialog()
      .locator("#rent-payment-reason")
      .fill("Audited rent correction " + run);
    await dialog().locator("#payment-amount").fill(amount);
    const result = await commit<PaymentDTO>(
      "/api/v1/rent/payments/" + payment.id + "/correct/",
      "Save Rent Payment Correction"
    );
    await closeDetails();
    return result;
  };
  const reverse = async (obligation: ObligationDTO, payment: PaymentDTO) => {
    await details(obligation);
    await page
      .getByTestId("rent-payment-" + payment.id)
      .getByRole("button", { name: "Reverse Rent Payment", exact: true })
      .click();
    await dialog()
      .locator("#rent-reverse-reason")
      .fill("Audited rent reversal " + run);
    await commit("/api/v1/rent/payments/" + payment.id + "/reverse/", "Confirm Rent Reversal");
    await closeDetails();
  };
  const adjust = async (r: ReserveDTO, amount: string) => {
    await page
      .getByTestId("rent-reserve-" + r.id)
      .getByRole("button", { name: "Adjust", exact: true })
      .click();
    await dialog().locator("#target-amount").fill(amount);
    await dialog()
      .locator("#adjust-reason")
      .fill("Controlled reserve adjustment " + run);
    return commit<ReserveDTO>("/api/v1/rent/reserves/" + r.id + "/adjust/", "Save Adjustment");
  };
  const assertHealthy = () =>
    expect(unavailable, "No backend/proxy 5xx may be hidden by the journey").toEqual([]);
  return {
    run,
    date,
    api,
    headers,
    get,
    fixture,
    account,
    contact,
    category,
    dialog,
    commit,
    createPlan,
    generate,
    reserve,
    openPay,
    pay,
    details,
    closeDetails,
    repay,
    capacity,
    correct,
    reverse,
    adjust,
    assertHealthy,
  };
}
