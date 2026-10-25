import { test, expect, request as playwrightRequest } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { authPost, backendOrigin, frontendOrigin, openResource, posted } from "./live-api";
import { confirmUiFinancial } from "./financial-ui";
import { todayInKolkata } from "../src/features/onboarding/money";
import type { EventDTO } from "../src/features/finance/api";
import type { BillDTO } from "../src/features/relationships/api";

test.use({ storageState: { cookies: [], origins: [] } });
test("real Django contacts, loans, partial repayments, shared bills, corrections and isolation", async ({
  page,
  context,
}) => {
  test.setTimeout(1_200_000);
  const unavailable: { path: string; status: number }[] = [];
  page.on("response", (response) => {
    if (response.url().startsWith(frontendOrigin) && response.status() >= 500)
      unavailable.push({ path: new URL(response.url()).pathname, status: response.status() });
  });
  const run = `p4-${Date.now()}-${randomUUID().slice(0, 6)}`;
  const email = `kivo-${run}@example.test`,
    password = `${randomBytes(24).toString("base64url")}!a7`;
  const api = context.request,
    date = todayInKolkata();
  expect(
    (
      await authPost(api, "/api/v1/auth/register/", { name: `Kivo ${run}`, email, password })
    ).status()
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
  const fixture = async (path: string, body: object) => {
    const response = await api.post(`${backendOrigin}/api/v1/${path}/`, {
      data: body,
      headers: await headers(),
      timeout: 60_000,
    });
    expect(response.status(), `Unconfirmed ${path} fixture; no blind retry`).toBe(201);
    return response.json();
  };
  const get = async (path: string) => {
    // The independent accounting oracle reads Django directly with the same owned session.
    // Its test-only timeout does not change the browser bridge's bounded deadline.
    const response = await api.get(`${backendOrigin}/api/v1/${path}`, {
      headers: await headers(),
      timeout: 60_000,
    });
    expect(response.status()).toBe(200);
    return response.json();
  };
  const submit = async (path: string, name: string, method = "POST") => {
    // Observation includes Playwright's click auto-wait and the bounded HTTP request.
    const response = page.waitForResponse((r) => posted(r, path, method), { timeout: 40_000 });
    await page.getByRole("dialog").getByRole("button", { name, exact: true }).click();
    const result = await confirmUiFinancial(page, await response, path);
    await expect(page.getByRole("dialog")).not.toBeVisible();
    return result;
  };
  const bank = await fixture("accounts", {
    name: `${run} Bank`,
    kind: "bank",
    opened_on: date,
    opening_balance: "10.00",
  });
  const category = await fixture("categories", { name: `${run} Category` });
  await openResource(page, "/people", "/api/v1/contacts/");
  await expect(page.getByRole("heading", { name: "No contacts found", exact: true })).toBeVisible();
  const contact = async (name: string) => {
    await page.getByRole("button", { name: "Add Contact", exact: true }).first().click();
    await page.getByLabel(/Full Name or Nickname/).fill(name);
    await page.getByLabel(/Relationship \/ Notes/).fill("Identifiable Part 4 development test");
    return submit("/api/v1/contacts/", "Save Contact");
  };
  const alice = await contact(`${run} Alice`),
    bob = await contact(`${run} Bob`);
  await openResource(page, `/people/${alice.id}`, `/api/v1/contacts/${alice.id}/`);
  await page.getByRole("button", { name: "Edit Contact", exact: true }).click();
  await page.getByLabel(/Relationship \/ Notes/).fill("Updated through real Django PATCH");
  const edited = await submit(`/api/v1/contacts/${alice.id}/`, "Save Changes", "PATCH");
  expect(edited.notes).toBe("Updated through real Django PATCH");
  const dashboard = async (
    liquid: string,
    receivable: string,
    payable: string,
    expense: string
  ) => {
    const data = await get("dashboard/?period=month");
    expect(data).toMatchObject({
      liquid_balance: liquid,
      receivables: receivable,
      payables: payable,
      selected_period: { external_income: "0.00", personal_expense: expense },
    });
    const accounts = await get("accounts/");
    expect(accounts.results.find((a: { id: string }) => a.id === bank.id).balance).toBe(liquid);
    return data;
  };
  const loan = async (kind: "lend" | "borrow", person: string, amount: string, title: string) => {
    if (new URL(page.url()).pathname !== "/people") await page.goto("/people");
    await page
      .getByRole("button", { name: kind === "lend" ? "Lend" : "Borrow", exact: true })
      .click();
    await page.locator("#loan-contact").selectOption(person);
    await page.getByLabel(/Amount/).fill(amount);
    await page.locator("#loan-account").selectOption(bank.id);
    await page.locator("#loan-title").fill(title);
    return submit(
      "/api/v1/loans/",
      kind === "lend" ? "Record Lent Money" : "Record Borrowed Money"
    );
  };
  const repayment = async (claim: string, amount: string, title: string) => {
    if (new URL(page.url()).pathname !== "/people") await page.goto("/people");
    await page.getByRole("button", { name: "Record Repayment", exact: true }).click();
    await page.locator("#settlement-claim").selectOption(claim);
    await page.locator("#settlement-amount").fill(amount);
    await page.locator("#settlement-account").selectOption(bank.id);
    await page.locator("#settlement-title").fill(title);
    return submit("/api/v1/settlements/", "Record Repayment");
  };
  const reverse = async (id: string, domain: string, bill = false) => {
    if (bill) await openResource(page, `/shared-expenses/${id}`, `/api/v1/shared-bills/${id}/`);
    else if (new URL(page.url()).pathname !== "/people") await page.goto("/people");
    const action = bill
      ? page.getByRole("button", { name: "Reverse", exact: true }).first()
      : page.getByTestId(`event-${id}`).getByRole("button", { name: "Reverse", exact: true });
    await action.click();
    await page
      .getByLabel("Audit Reason", { exact: true })
      .fill("Part 4 controlled audited reversal");
    return submit(`/api/v1/${domain}/${id}/reverse/`, "Confirm Reversal");
  };
  let lent!: EventDTO, settlement!: EventDTO;
  await test.step("real lending and partial/full repayment without fresh income", async () => {
    lent = await loan("lend", alice.id, "1.00", `${run} lent`);
    await dashboard("9.00", "1.00", "0.00", "0.00");
    settlement = await repayment(lent.claims[0], "0.40", `${run} recovery partial`);
    expect(settlement.kind).toBe("repay_in");
    expect(await get(`claims/${lent.claims[0]}/`)).toMatchObject({
      status: "partial",
      outstanding: "0.60",
    });
    await repayment(lent.claims[0], "0.60", `${run} recovery full`);
    await dashboard("10.00", "0.00", "0.00", "0.00");
    const history = await get(`contacts/${alice.id}/history/`);
    expect(history.results.map((e: { kind: string }) => e.kind)).toEqual(
      expect.arrayContaining(["lend", "repay_in"])
    );
    await openResource(page, `/people/${alice.id}`, `/api/v1/contacts/${alice.id}/`);
    await page.getByRole("button", { name: "View claim history", exact: true }).first().click();
    await expect(
      page.getByRole("dialog").getByText(`${run} recovery partial`, { exact: true })
    ).toBeVisible();
    await page.keyboard.press("Escape");
  });
  await test.step("borrowing and partial/full payable repayments remain outside income/expense", async () => {
    const borrowed = await loan("borrow", bob.id, "0.50", `${run} borrowed`);
    await dashboard("10.50", "0.00", "0.50", "0.00");
    const paid = await repayment(borrowed.claims[0], "0.20", `${run} paid partial`);
    expect(paid.kind).toBe("repay_out");
    await dashboard("10.30", "0.00", "0.30", "0.00");
    await repayment(borrowed.claims[0], "0.30", `${run} paid full`);
    await dashboard("10.00", "0.00", "0.00", "0.00");
  });
  await test.step("loan correction and reversal append immutable history", async () => {
    const original = await loan("lend", alice.id, "0.01", `${run} correctable`);
    await page
      .getByTestId(`event-${original.id}`)
      .getByRole("button", { name: "Correct", exact: true })
      .click();
    await page
      .getByLabel("Audit Reason", { exact: true })
      .fill("Part 4 precise original loan correction");
    await page.locator("#loan-amount").fill("0.02");
    const revised = await submit(`/api/v1/loans/${original.id}/correct/`, "Record Lent Money");
    expect(revised.supersedes).toBe(original.id);
    expect(await get(`claims/${original.claims[0]}/`)).toMatchObject({
      status: "cancelled",
      outstanding: "0.00",
    });
    await dashboard("9.98", "0.02", "0.00", "0.00");
    await reverse(revised.id, "loans");
    await dashboard("10.00", "0.00", "0.00", "0.00");
  });
  const bill = async (
    title: string,
    friendPaid: boolean,
    amount: string,
    custom?: { owner: string; friend: string }
  ) => {
    await page.goto("/shared-expenses");
    await page.getByRole("button", { name: "Create Shared Bill", exact: true }).first().click();
    await page.getByLabel("Bill Title", { exact: true }).fill(title);
    await page.getByLabel("Total Bill Amount (₹)", { exact: true }).fill(amount);
    await page.getByLabel("Category", { exact: true }).selectOption(category.id);
    await page.getByLabel(bob.display_name, { exact: true }).check();
    if (!custom) await page.getByLabel(alice.display_name, { exact: true }).check();
    await page
      .getByLabel("Who Paid?", { exact: true })
      .selectOption(friendPaid ? "friend" : "user");
    if (friendPaid) await page.getByLabel("Friend Who Paid", { exact: true }).selectOption(bob.id);
    else await page.getByLabel("Payment Account", { exact: true }).selectOption(bank.id);
    if (custom) {
      await page.getByLabel("Split Method", { exact: true }).selectOption("custom");
      await page.getByLabel("Your Custom Share (₹)", { exact: true }).fill(custom.owner);
      await page
        .getByLabel(`Custom share for ${bob.display_name} (₹)`, { exact: true })
        .fill(custom.friend);
    }
    return submit("/api/v1/shared-bills/", "Create Shared Bill");
  };
  let ownerBill!: BillDTO;
  await test.step("owner-paid equal split uses Django remainder paise and actual receivables", async () => {
    ownerBill = await bill(`${run} owner paid equal`, false, "1.01");
    expect(
      ownerBill.shares.find((s: { contact: string | null }) => s.contact === null)!.amount
    ).toBe("0.34");
    await dashboard("8.99", "0.67", "0.00", "0.34");
    await openResource(
      page,
      `/shared-expenses/${ownerBill.id}`,
      `/api/v1/shared-bills/${ownerBill.id}/`
    );
    await expect(page.getByTestId("share-owner")).toContainText("₹0.34");
    const shares = ownerBill.shares.filter((s: { claim: string | null }) => !!s.claim);
    await repayment(shares[0].claim!, "0.10", `${run} shared recovery partial`);
    const partial = await get(`claims/${shares[0].claim}/`);
    expect(partial.status).toBe("partial");
    await repayment(partial.id, partial.outstanding, `${run} shared recovery full`);
    await repayment(shares[1].claim!, shares[1].amount, `${run} other recovery full`);
    await dashboard("9.66", "0.00", "0.00", "0.34");
  });
  await test.step("friend-paid custom split creates only the owner's payable and expense", async () => {
    const friendBill = await bill(`${run} friend paid custom`, true, "1.00", {
      owner: "0.25",
      friend: "0.75",
    });
    expect(friendBill.event.kind).toBe("shared_due");
    await dashboard("9.66", "0.00", "0.25", "0.59");
    const claim = friendBill.shares.find((s: { claim: string | null }) => !!s.claim).claim;
    await repayment(claim, "0.10", `${run} friend payment partial`);
    await repayment(claim, "0.15", `${run} friend payment full`);
    const data = await dashboard("9.41", "0.00", "0.00", "0.59");
    expect(data.selected_period.repayments_received).toBe("1.67");
  });
  await test.step("shared bill corrections use bill UUID and preserve original history", async () => {
    const original = await bill(`${run} correctable bill`, true, "0.03", {
      owner: "0.01",
      friend: "0.02",
    });
    await openResource(
      page,
      `/shared-expenses/${original.id}`,
      `/api/v1/shared-bills/${original.id}/`
    );
    await page.getByRole("button", { name: "Correct", exact: true }).first().click();
    await page
      .getByLabel("Audit Reason", { exact: true })
      .fill("Part 4 audited shared bill correction");
    await page.getByLabel("Total Bill Amount (₹)", { exact: true }).fill("0.04");
    await page.getByLabel("Your Custom Share (₹)", { exact: true }).fill("0.02");
    const corrected = await submit(
      `/api/v1/shared-bills/${original.id}/correct/`,
      "Save Bill Correction"
    );
    expect(corrected.event.supersedes).toBe(original.event.id);
    await dashboard("9.41", "0.00", "0.02", "0.61");
    await reverse(corrected.id, "shared-bills", true);
    await dashboard("9.41", "0.00", "0.00", "0.59");
  });
  await test.step("settlement reversal and correction preserve principal and cash effects", async () => {
    const original = await loan("lend", alice.id, "0.03", `${run} settlement correction source`);
    const paid = await repayment(original.claims[0], "0.01", `${run} correctable repayment`);
    await page
      .getByTestId(`event-${paid.id}`)
      .getByRole("button", { name: "Correct", exact: true })
      .click();
    await page
      .getByLabel("Audit Reason", { exact: true })
      .fill("Part 4 audited settlement correction");
    await page.locator("#settlement-amount").fill("0.02");
    const corrected = await submit(`/api/v1/settlements/${paid.id}/correct/`, "Record Repayment");
    expect(corrected.supersedes).toBe(paid.id);
    expect(await get(`claims/${original.claims[0]}/`)).toMatchObject({
      outstanding: "0.01",
      status: "partial",
    });
    await reverse(corrected.id, "settlements");
    await reverse(original.id, "loans");
    await dashboard("9.41", "0.00", "0.00", "0.59");
  });
  await test.step("permissions, CSRF, validation and original-key replay", async () => {
    const foreign = await playwrightRequest.newContext({
      storageState: ".playwright-auth/session.json",
    });
    for (const path of [
      `contacts/${alice.id}/`,
      `contacts/${alice.id}/history/`,
      `loans/${lent.id}/`,
      `claims/${lent.claims[0]}/`,
      `claims/${lent.claims[0]}/history/`,
      `settlements/${settlement.id}/`,
      `shared-bills/${ownerBill.id}/`,
    ])
      expect((await foreign.get(`${frontendOrigin}/api/v1/${path}`)).status()).toBe(404);
    const foreignState = await foreign.storageState();
    const foreignHeaders = () => ({
      Origin: frontendOrigin,
      "X-CSRFToken": foreignState.cookies.find((c) => c.name === "csrftoken")!.value,
      "Idempotency-Key": randomUUID(),
    });
    expect(
      (
        await foreign.patch(`${frontendOrigin}/api/v1/contacts/${alice.id}/`, {
          headers: foreignHeaders(),
          data: { notes: "Unauthorized test change" },
        })
      ).status()
    ).toBe(404);
    expect(
      (
        await foreign.post(`${frontendOrigin}/api/v1/loans/`, {
          headers: foreignHeaders(),
          data: {
            kind: "lend",
            contact: alice.id,
            account: process.env.KIVO_E2E_ACCOUNT_A!,
            amount: "0.01",
            effective_date: date,
            title: `${run} forbidden foreign loan`,
          },
        })
      ).status()
    ).toBe(404);
    expect(
      (
        await foreign.post(`${frontendOrigin}/api/v1/settlements/`, {
          headers: foreignHeaders(),
          data: {
            claim: lent.claims[0],
            account: process.env.KIVO_E2E_ACCOUNT_A!,
            amount: "0.01",
            effective_date: date,
            title: `${run} forbidden foreign settlement`,
          },
        })
      ).status()
    ).toBe(404);
    expect(
      (
        await foreign.post(`${frontendOrigin}/api/v1/shared-bills/`, {
          headers: foreignHeaders(),
          data: {
            account: process.env.KIVO_E2E_ACCOUNT_A!,
            category: process.env.KIVO_E2E_CATEGORY_A!,
            payer: null,
            amount: "0.01",
            effective_date: date,
            title: `${run} forbidden foreign participant`,
            split_method: "equal",
            participants: [{ contact: null }, { contact: bob.id }],
          },
        })
      ).status()
    ).toBe(404);
    await foreign.dispose();
    expect(
      (
        await api.post(`${frontendOrigin}/api/v1/loans/`, {
          data: {},
          headers: { Origin: frontendOrigin, "Idempotency-Key": randomUUID() },
        })
      ).status()
    ).toBe(403);
    const invalid = await api.post(`${frontendOrigin}/api/v1/shared-bills/`, {
      headers: await headers(),
      data: {
        amount: "0.10",
        category: category.id,
        account: bank.id,
        effective_date: date,
        title: `${run} invalid`,
        payer: null,
        split_method: "custom",
        participants: [
          { contact: null, amount: "0.09" },
          { contact: bob.id, amount: "0.02" },
        ],
      },
    });
    expect(invalid.status()).toBe(400);
    // The original operation goes through the UI so its confirmed mutation also
    // invalidates the owned list. Capture its exact intent for deliberate replay;
    // an external fixture write cannot be expected to notify the browser cache.
    const outgoing = page.waitForRequest(
      (request) =>
        request.method() === "POST" &&
        new URL(request.url()).pathname.replace(/\/$/, "") === "/api/v1/loans"
    );
    const event = await loan("lend", alice.id, "0.01", `${run} idempotency`);
    let original = await outgoing;
    while (original.redirectedFrom()) original = original.redirectedFrom()!;
    const key = (await original.allHeaders())["idempotency-key"],
      body = original.postDataJSON();
    expect(key).toBeTruthy();
    const replay = await api.post(`${backendOrigin}/api/v1/loans/`, {
      headers: await headers(key),
      data: body,
      timeout: 60_000,
    });
    expect(replay.status()).toBe(200);
    expect((await replay.json()).id).toBe(event.id);
    expect(
      (
        await api.post(`${backendOrigin}/api/v1/loans/`, {
          headers: await headers(key),
          data: { ...body, amount: "0.02" },
          timeout: 60_000,
        })
      ).status()
    ).toBe(409);
    await reverse(event.id, "loans");
    await dashboard("9.41", "0.00", "0.00", "0.59");
    await openResource(page, "/dashboard", "/api/v1/dashboard/");
    await expect(page.getByTestId("dashboard-metrics")).toContainText("₹9.41");
    await page.goto("/money/sources");
    await expect(
      page.getByRole("heading", { name: "Money Sources & Fund Journey", exact: true })
    ).toBeVisible();
    const funds = await get("funds/summary/");
    expect(funds.attribution_status).toBe("complete");
    // With no outstanding claims, Django's attributed remaining capacity must
    // agree with the independently retrieved liquid/account result above.
    expect(funds.remaining_capacity).toBe("9.41");
    expect(funds.unfunded_amount).toBe("0.00");
    await expect(
      page.getByText("₹9.41", { exact: true }).filter({ visible: true }).first()
    ).toBeVisible();
    const history = await get(`contacts/${alice.id}/history/`);
    expect(history.results.some((event: { kind: string }) => event.kind === "repay_in")).toBe(true);
    await page.reload();
    expect((await get("auth/me/")).email).toBe(email);
    expect(unavailable, "The complete journey must not hide backend/proxy 5xx responses").toEqual(
      []
    );
  });
  console.log(
    "Part 4 actual Django/PostgreSQL: UI contacts/PATCH, lending/borrowing, partial/full repayments, equal/custom bills, all correction/reversal families, exact authoritative balances, CSRF, idempotency and foreign-user isolation confirmed."
  );
});
