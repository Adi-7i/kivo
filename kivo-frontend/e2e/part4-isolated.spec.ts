import {
  test as base,
  expect,
  request as playwrightRequest,
  type Page,
  type BrowserContext,
} from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { authPost, backendOrigin, frontendOrigin, posted, openResource } from "./live-api";
import { confirmUiFinancial } from "./financial-ui";
import { todayInKolkata } from "../src/features/onboarding/money";

async function setup(page: Page, context: BrowserContext) {
  const run = `p4-isolated-${Date.now()}-${randomUUID().slice(0, 5)}`,
    date = todayInKolkata();
  const email = `kivo-${run}@example.test`,
    password = `${randomBytes(24).toString("base64url")}!a7`,
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
        .map((c) => `${c.name}=${c.value}`)
        .join("; "),
    };
  };
  const write = async (path: string, body: object, key?: string, status = 201) => {
    const response = await api.post(`${backendOrigin}/api/v1/${path}`, {
      data: body,
      headers: await headers(key),
      timeout: 60_000,
    });
    expect(response.status(), "Supported fixture request; never automatically retry writes").toBe(
      status
    );
    return response.json();
  };
  const get = async (path: string) => {
    const response = await api.get(`${backendOrigin}/api/v1/${path}`, {
      headers: await headers(),
      timeout: 60_000,
    });
    expect(response.status()).toBe(200);
    return response.json();
  };
  const account = await write("accounts/", {
    name: `${run} Bank`,
    kind: "bank",
    opened_on: date,
    opening_balance: "10.00",
  });
  const contact = await write("contacts/", { display_name: `${run} Friend` });
  const category = await write("categories/", { name: `${run} Category` });
  const submit = async (path: string, name: string) => {
    const response = page.waitForResponse((r) => posted(r, path), { timeout: 40_000 });
    await page.getByRole("dialog").getByRole("button", { name, exact: true }).click();
    const result = await confirmUiFinancial(page, await response, path);
    await expect(page.getByRole("dialog")).not.toBeVisible();
    return result;
  };
  const money = async (liquid: string, receivable: string, payable: string, expense: string) => {
    expect(await get("dashboard/?period=month")).toMatchObject({
      liquid_balance: liquid,
      receivables: receivable,
      payables: payable,
      selected_period: { external_income: "0.00", personal_expense: expense },
    });
  };
  const bill = async (friendPaid: boolean, total: string, owner: string, friend: string) => {
    await page.goto("/shared-expenses");
    await page.getByRole("button", { name: "Create Shared Bill", exact: true }).first().click();
    await page.getByLabel("Bill Title", { exact: true }).fill(`${run} Bill`);
    await page.getByLabel("Total Bill Amount (₹)", { exact: true }).fill(total);
    await page.getByLabel("Category", { exact: true }).selectOption(category.id);
    await page.getByLabel(contact.display_name, { exact: true }).check();
    await page
      .getByLabel("Who Paid?", { exact: true })
      .selectOption(friendPaid ? "friend" : "user");
    if (friendPaid)
      await page.getByLabel("Friend Who Paid", { exact: true }).selectOption(contact.id);
    else await page.getByLabel("Payment Account", { exact: true }).selectOption(account.id);
    await page.getByLabel("Split Method", { exact: true }).selectOption("custom");
    await page.getByLabel("Your Custom Share (₹)", { exact: true }).fill(owner);
    await page
      .getByLabel(`Custom share for ${contact.display_name} (₹)`, { exact: true })
      .fill(friend);
    return submit("/api/v1/shared-bills/", "Create Shared Bill");
  };
  const repay = async (claim: string, amount: string) => {
    if (new URL(page.url()).pathname !== "/people") await page.goto("/people");
    await page.getByRole("button", { name: "Record Repayment", exact: true }).click();
    await page.locator("#settlement-claim").selectOption(claim);
    await page.locator("#settlement-account").selectOption(account.id);
    await page.locator("#settlement-amount").fill(amount);
    await page.locator("#settlement-title").fill(`${run} Repayment`);
    return submit("/api/v1/settlements/", "Record Repayment");
  };
  const reverse = async (id: string, domain: string, billId?: string) => {
    if (billId)
      await openResource(page, `/shared-expenses/${billId}`, `/api/v1/shared-bills/${billId}/`);
    else if (new URL(page.url()).pathname !== "/people") await page.goto("/people");
    await (
      billId
        ? page.getByRole("button", { name: "Reverse", exact: true }).first()
        : page.getByTestId(`event-${id}`).getByRole("button", { name: "Reverse", exact: true })
    ).click();
    await page
      .getByLabel("Audit Reason", { exact: true })
      .fill("Identifiable isolated Part 4 audited reversal");
    return submit(`/api/v1/${domain}/${billId ?? id}/reverse/`, "Confirm Reversal");
  };
  return {
    run,
    date,
    api,
    account,
    contact,
    category,
    headers,
    write,
    get,
    submit,
    money,
    bill,
    repay,
    reverse,
  };
}
base.use({ storageState: { cookies: [], origins: [] } });
base.setTimeout(360_000);

base(
  "isolated real friend-paid custom bill and partial/full settlement",
  async ({ page, context }) => {
    const f = await setup(page, context);
    const bill = await f.bill(true, "0.10", "0.03", "0.07");
    expect(bill.event.kind).toBe("shared_due");
    expect(bill.event.account).toBeNull();
    await f.money("10.00", "0.00", "0.03", "0.03");
    const claim = bill.shares.find((s: { claim: string | null }) => !!s.claim).claim;
    await f.repay(claim, "0.01");
    expect(await f.get(`claims/${claim}/`)).toMatchObject({
      outstanding: "0.02",
      status: "partial",
    });
    await f.repay(claim, "0.02");
    await f.money("9.97", "0.00", "0.00", "0.03");
    await openResource(page, `/shared-expenses/${bill.id}`, `/api/v1/shared-bills/${bill.id}/`);
    await expect(page.getByText("All Settled Up", { exact: true })).toBeVisible();
  }
);

base("isolated real shared-bill correction and audited reversal", async ({ page, context }) => {
  const f = await setup(page, context);
  const bill = await f.bill(true, "0.03", "0.01", "0.02");
  await openResource(page, `/shared-expenses/${bill.id}`, `/api/v1/shared-bills/${bill.id}/`);
  await page.getByRole("button", { name: "Correct", exact: true }).first().click();
  await page.getByLabel("Audit Reason", { exact: true }).fill("Isolated Part 4 bill correction");
  await page.getByLabel("Total Bill Amount (₹)", { exact: true }).fill("0.04");
  await page.getByLabel("Your Custom Share (₹)", { exact: true }).fill("0.02");
  const corrected = await f.submit(
    `/api/v1/shared-bills/${bill.id}/correct/`,
    "Save Bill Correction"
  );
  expect(corrected.event.supersedes).toBe(bill.event.id);
  expect((await f.get(`shared-bills/${bill.id}/`)).event.status).toBe("reversed");
  await f.money("10.00", "0.00", "0.02", "0.02");
  await f.reverse(corrected.event.id, "shared-bills", corrected.id);
  await f.money("10.00", "0.00", "0.00", "0.00");
});

base(
  "isolated real settlement correction/reversal, idempotency and write isolation",
  async ({ page, context }) => {
    const f = await setup(page, context);
    const body = {
      kind: "lend",
      contact: f.contact.id,
      account: f.account.id,
      amount: "0.03",
      effective_date: f.date,
      title: `${f.run} Lending fixture`,
    };
    const key = randomUUID();
    const loan = await f.write("loans/", body, key);
    expect((await f.write("loans/", body, key, 200)).id).toBe(loan.id);
    await f.write("loans/", { ...body, amount: "0.04" }, key, 409);
    await page.goto("/people");
    const paid = await f.repay(loan.claims[0], "0.01");
    await page
      .getByTestId(`event-${paid.id}`)
      .getByRole("button", { name: "Correct", exact: true })
      .click();
    await page
      .getByLabel("Audit Reason", { exact: true })
      .fill("Isolated Part 4 repayment correction");
    await page.locator("#settlement-amount").fill("0.02");
    const corrected = await f.submit(`/api/v1/settlements/${paid.id}/correct/`, "Record Repayment");
    expect(corrected.supersedes).toBe(paid.id);
    expect(await f.get(`claims/${loan.claims[0]}/`)).toMatchObject({
      status: "partial",
      outstanding: "0.01",
    });
    await f.money("9.99", "0.01", "0.00", "0.00");
    await f.reverse(corrected.id, "settlements");
    await f.reverse(loan.id, "loans");
    await f.money("10.00", "0.00", "0.00", "0.00");
    const foreign = await playwrightRequest.newContext({
      storageState: ".playwright-auth/session.json",
    });
    const state = await foreign.storageState();
    const headers = () => ({
      Origin: frontendOrigin,
      "X-CSRFToken": state.cookies.find((c) => c.name === "csrftoken")!.value,
      "Idempotency-Key": randomUUID(),
    });
    for (const path of [
      `contacts/${f.contact.id}/`,
      `loans/${loan.id}/`,
      `claims/${loan.claims[0]}/`,
      `settlements/${paid.id}/`,
    ])
      expect((await foreign.get(`${frontendOrigin}/api/v1/${path}`)).status()).toBe(404);
    expect(
      (
        await foreign.patch(`${frontendOrigin}/api/v1/contacts/${f.contact.id}/`, {
          headers: headers(),
          data: { notes: "Forbidden foreign change" },
        })
      ).status()
    ).toBe(404);
    expect(
      (
        await foreign.post(`${frontendOrigin}/api/v1/loans/`, {
          headers: headers(),
          data: { ...body, account: process.env.KIVO_E2E_ACCOUNT_A! },
        })
      ).status()
    ).toBe(404);
    expect(
      (
        await foreign.post(`${frontendOrigin}/api/v1/settlements/`, {
          headers: headers(),
          data: {
            account: process.env.KIVO_E2E_ACCOUNT_A!,
            claim: loan.claims[0],
            amount: "0.01",
            effective_date: f.date,
            title: "Forbidden foreign settlement",
          },
        })
      ).status()
    ).toBe(404);
    await foreign.dispose();
    expect(
      (
        await f.api.post(`${frontendOrigin}/api/v1/loans/`, {
          headers: { Origin: frontendOrigin, "Idempotency-Key": randomUUID() },
          data: body,
        })
      ).status()
    ).toBe(403);
    await f.money("10.00", "0.00", "0.00", "0.00");
  }
);
