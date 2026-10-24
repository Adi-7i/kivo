import { test, expect, request as playwrightRequest, type Response } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { authPost, backendOrigin, frontendOrigin, posted, openResource } from "./live-api";

// All writes use fresh, identifiable development users and supported Django workflows.
test.use({ storageState: { cookies: [], origins: [] } });
test("real Django core transactions, recovery, immutable corrections and isolation", async ({
  page,
  context,
}) => {
  test.setTimeout(600_000);
  const run = `${process.env.KIVO_E2E_RUN}-${randomUUID().slice(0, 6)}`;
  const password = `${randomBytes(24).toString("base64url")}!a7`;
  const email = `kivo-part2-${run}@example.test`;
  const api = context.request;
  const register = await authPost(api, "/api/v1/auth/register/", {
    email,
    password,
    name: `Kivo Part2 ${run}`,
  });
  expect(register.status()).toBe(201);
  expect((await authPost(api, "/api/v1/auth/login/", { email, password })).status()).toBe(200);
  const headers = async (key: string = randomUUID()) => ({
    Origin: frontendOrigin,
    "X-CSRFToken": (await context.cookies()).find((cookie) => cookie.name === "csrftoken")!.value,
    "Idempotency-Key": key,
  });
  const write = async (
    path: string,
    body: object,
    key: string = randomUUID(),
    method: "POST" | "PATCH" = "POST"
  ) => {
    const response = await api.fetch(`${frontendOrigin}${path}`, {
      method,
      data: body,
      headers: await headers(key),
    });
    const auditAction = path.match(/^\/api\/v1\/transactions\/([^/]+)\/(reverse|void|correct)\/$/);
    if (response.status() >= 500 && method === "POST" && auditAction) {
      // Reconcile only a unique immutable relationship, never a similar title/amount or a new POST.
      let confirmed: Record<string, unknown> | undefined;
      const expected = body as Record<string, unknown>;
      await expect
        .poll(
          async () => {
            const originalResponse = await api.get(
              `${frontendOrigin}/api/v1/transactions/${auditAction[1]}/`
            );
            if (!originalResponse.ok()) return false;
            const original = await originalResponse.json();
            if (auditAction[2] === "correct") {
              const historyResponse = await api.get(`${frontendOrigin}/api/v1/transactions/`, {
                params: { search: String(expected.title), period: "all" },
              });
              if (!historyResponse.ok()) return false;
              const history = await historyResponse.json();
              confirmed = history.results.find(
                (event: Record<string, unknown>) =>
                  event.supersedes === auditAction[1] &&
                  Object.entries(expected).every(([field, value]) => event[field] === value)
              );
              return !!original.reversed_by && !!confirmed;
            }
            if (
              !original.reversed_by ||
              original.status !== (auditAction[2] === "void" ? "voided" : "reversed")
            )
              return false;
            const reversalResponse = await api.get(
              `${frontendOrigin}/api/v1/transactions/${original.reversed_by}/`
            );
            if (!reversalResponse.ok()) return false;
            const reversal = await reversalResponse.json();
            if (reversal.reverses !== auditAction[1] || reversal.reason !== expected.reason)
              return false;
            confirmed = reversal;
            return true;
          },
          { timeout: 20_000, intervals: [1000, 2000] }
        )
        .toBe(true);
      console.log(
        `Development financial test: HTTP ${response.status()} ${auditAction[2]} confirmed by unique audit-link GETs; no POST retry.`
      );
      return confirmed!;
    }
    expect(
      response.status(),
      `Unconfirmed ${method} ${path}; preserve this test's identifiable records, never automatically retry`
    ).toBe(method === "PATCH" ? 200 : 201);
    return response.json();
  };
  const get = async (path: string) => {
    const response = await api.get(`${frontendOrigin}${path}`);
    expect(response.status()).toBe(200);
    return response.json();
  };
  const confirmUiWrite = async (response: Response, path: string) => {
    if (response.status() < 500 && response.status() !== 408) {
      expect(response.status()).toBe(201);
      return response.json();
    }
    // Exercise the explicit user recovery controls; never retry with a new operation identity.
    let originalRequest = response.request();
    while (originalRequest.redirectedFrom()) originalRequest = originalRequest.redirectedFrom()!;
    const originalKey = (await originalRequest.allHeaders())["idempotency-key"];
    expect(originalKey).toBeTruthy();
    const originalBody = originalRequest.postDataJSON();
    const originalResource = path.match(
      /^(\/api\/v1\/transactions\/[^/]+\/)(?:correct|void|reverse)\/$/
    );
    if (originalResource) {
      await openResource(page, page.url(), originalResource[1]);
      await page.getByRole("button", { name: "Resolve pending request", exact: true }).click();
    }
    await expect(page.getByRole("button", { name: "Check server status" })).toBeVisible();
    await page.getByRole("button", { name: "Check server status" }).click();
    await expect(page.getByRole("button", { name: "Retry original request" })).toBeVisible({
      timeout: 20_000,
    });
    const replayed = page.waitForResponse((result) => posted(result, path));
    const retried = page.waitForRequest(
      (request) =>
        new URL(request.url()).pathname.replace(/\/$/, "") === path.replace(/\/$/, "") &&
        request.method() === "POST"
    );
    await page.getByRole("button", { name: "Retry original request" }).click();
    const replayRequest = await retried;
    expect((await replayRequest.allHeaders())["idempotency-key"]).toBe(originalKey);
    expect(replayRequest.postDataJSON()).toEqual(originalBody);
    const confirmation = await replayed;
    expect([200, 201]).toContain(confirmation.status());
    console.log(
      `Development financial UI: HTTP ${response.status()} explicitly reconciled and retried with identical key/body; Django confirmed ${confirmation.status()}.`
    );
    return confirmation.json();
  };
  // Summary is read directly only as an authoritative test oracle, not integrated into Part 3 UI/BFF.
  const summary = async () => {
    const cookie = (await context.cookies())
      .filter((c) => ["sessionid", "csrftoken"].includes(c.name))
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
    const response = await api.get(`${backendOrigin}/api/v1/accounts/summary/`, {
      headers: { Cookie: cookie },
    });
    expect(response.status()).toBe(200);
    return response.json();
  };
  const date = "2026-10-22";
  const bank = await write("/api/v1/accounts/", {
    name: `Part2 Bank ${run}`,
    kind: "bank",
    opened_on: date,
    opening_balance: "10.00",
  });
  const cash = await write("/api/v1/accounts/", {
    name: `Part2 Cash ${run}`,
    kind: "cash",
    opened_on: date,
    opening_balance: "0.00",
  });
  const wallet = await write("/api/v1/accounts/", {
    name: `Part2 Wallet ${run}`,
    kind: "wallet",
    opened_on: date,
    opening_balance: "0.00",
  });
  expect(bank.balance).toBe("10.00");
  expect(await summary()).toEqual({
    liquid_balance: "10.00",
    personal_expense: "0.00",
    external_receipts: "0.00",
  });
  await write(
    `/api/v1/accounts/${wallet.id}/`,
    { name: `Part2 Archived Wallet ${run}`, archived: true },
    undefined,
    "PATCH"
  );
  expect((await get(`/api/v1/accounts/${wallet.id}/`)).archived).toBe(true);
  const nonzeroArchive = await api.patch(`${frontendOrigin}/api/v1/accounts/${bank.id}/`, {
    data: { archived: true },
    headers: await headers(),
  });
  expect(nonzeroArchive.status()).toBe(409);

  const defaultNames = [
    "Food",
    "Transport",
    "Housing",
    "Shopping",
    "Health",
    "Education",
    "Other",
    "Groceries",
    "Friends & Social",
    "Utilities & Recharge",
  ].sort();
  expect((await get("/api/v1/categories/")).count).toBe(0);
  const seed = async () => {
    const response = await api.post(`${frontendOrigin}/api/v1/categories/defaults/`, {
      data: {},
      headers: await headers(),
    });
    if (response.status() >= 500) {
      // This fresh test identity has no categories yet. Confirm the exact server defaults
      // through owned GETs after an ambiguous initialization; never resend the POST here.
      let confirmed: { id: string; name: string; parent: string | null }[] = [];
      await expect
        .poll(
          async () => {
            const owned = await api.get(`${frontendOrigin}/api/v1/categories/`);
            if (!owned.ok()) return false;
            const categories = await owned.json();
            confirmed = categories.results;
            return (
              categories.count === 10 &&
              confirmed.length === 10 &&
              new Set(confirmed.map((item) => item.id)).size === 10 &&
              confirmed.every((item) => item.parent === null) &&
              JSON.stringify(confirmed.map((item) => item.name).sort()) ===
                JSON.stringify(defaultNames)
            );
          },
          { timeout: 20_000, intervals: [1000, 2000] }
        )
        .toBe(true);
      console.log(
        `Development defaults: HTTP ${response.status()} followed by owned GET confirmation of ten unique roots; no POST retry.`
      );
      return confirmed;
    }
    expect(response.status()).toBe(200);
    return response.json();
  };
  const firstDefaults = await seed();
  const secondDefaults = await seed();
  expect(secondDefaults.map((c: { id: string }) => c.id).sort()).toEqual(
    firstDefaults.map((c: { id: string }) => c.id).sort()
  );
  expect(firstDefaults.map((c: { name: string }) => c.name).sort()).toEqual(defaultNames);
  expect((await get("/api/v1/categories/")).count).toBe(10);
  const category = await write("/api/v1/categories/", { name: `Part2 Category ${run}` });
  const categoryName = `Part2 Meals ${run}`;
  await write(`/api/v1/categories/${category.id}/`, { name: categoryName }, undefined, "PATCH");
  expect((await get(`/api/v1/categories/${category.id}/`)).name).toBe(categoryName);

  console.log("Part 2 real integration: accounts, opening equity and category defaults confirmed.");
  await openResource(page, "/settings/categories", "/api/v1/categories/");
  await expect(page.getByText(categoryName, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add Category", exact: true }).click();
  const uiCategoryName = `Part2 UI Category ${run}`;
  await page.getByLabel("Category Name").fill(uiCategoryName);
  const uiCreated = page.waitForResponse((response) => posted(response, "/api/v1/categories/"));
  await page.getByRole("button", { name: "Create Category", exact: true }).click();
  const uiCategoryResponse = await uiCreated;
  expect(uiCategoryResponse.status()).toBe(201);
  const uiCategory = await uiCategoryResponse.json();
  await page.getByRole("button", { name: `Edit ${uiCategoryName}`, exact: true }).click();
  await page.getByLabel("Category Name").fill(`${uiCategoryName} Edited`);
  await page.getByLabel("Archived", { exact: true }).check();
  const uiPatched = page.waitForResponse((response) =>
    posted(response, `/api/v1/categories/${uiCategory.id}/`, "PATCH")
  );
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  expect((await uiPatched).status()).toBe(200);
  const archivedCategory = await get(`/api/v1/categories/${uiCategory.id}/`);
  expect(archivedCategory.archived).toBe(true);
  expect(archivedCategory.name).toBe(`${uiCategoryName} Edited`);
  await openResource(page, `/money/${bank.id}`, `/api/v1/accounts/${bank.id}/`);
  await expect(page.getByRole("heading", { name: bank.name })).toBeVisible();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.getByLabel("Opening Balance (₹)")).toHaveAttribute("readonly", "");
  const renamedBank = `${bank.name} Renamed`;
  await page.getByLabel("Account Name").fill(renamedBank);
  const accountPatched = page.waitForResponse((response) =>
    posted(response, `/api/v1/accounts/${bank.id}/`, "PATCH")
  );
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  expect((await accountPatched).status()).toBe(200);
  expect((await get(`/api/v1/accounts/${bank.id}/`)).name).toBe(renamedBank);
  await page.goto("/transactions");
  const quickAdd = async (tab: string) => {
    await page.getByRole("button", { name: "Quick Add", exact: true }).click();
    await expect(page.getByRole("tab", { name: tab, exact: true })).toBeEnabled();
    await page.getByRole("tab", { name: tab, exact: true }).click();
    return page.locator("form:visible");
  };
  let form = await quickAdd("Received");
  await form.getByLabel(/Amount/).fill("2");
  await form.getByLabel("Source / Description").fill(`Part2 receipt ${run}`);
  await form.getByLabel("External Funding Source").fill("Development smoke funds");
  await form.getByLabel("Receiving Account").selectOption(bank.id);
  const received = page.waitForResponse((response) => posted(response, "/api/v1/transactions/"));
  await form.getByRole("button", { name: "Record Receipt" }).dblclick();
  const receiptResponse = await received;
  const receipt = await confirmUiWrite(receiptResponse, "/api/v1/transactions/");
  await expect(page.getByRole("heading", { name: "Quick Add Transaction" })).not.toBeVisible();
  expect(receipt.amount).toBe("2.00");
  expect(receipt.funding_source).toBe("Development smoke funds");
  expect((await get(`/api/v1/transactions/?search=Part2%20receipt%20${run}`)).count).toBe(1);

  form = await quickAdd("Expense");
  await form.getByLabel(/Amount/).fill("0.29");
  await form.getByLabel("Description / Title").fill(`Part2 lunch ${run}`);
  await form.getByLabel(/^Category/).selectOption(category.id);
  await form.getByLabel("Payment Account").selectOption(bank.id);
  const expensed = page.waitForResponse((response) => posted(response, "/api/v1/transactions/"));
  await form.getByRole("button", { name: "Record Expense" }).click();
  const expenseResponse = await expensed;
  const expense = await confirmUiWrite(expenseResponse, "/api/v1/transactions/");
  await expect(page.getByRole("heading", { name: "Quick Add Transaction" })).not.toBeVisible();
  expect((await get(`/api/v1/accounts/${bank.id}/`)).balance).toBe("11.71");
  form = await quickAdd("Transfer");
  await form.getByLabel(/Amount/).fill("1.01");
  await form.getByLabel("From Account").selectOption(bank.id);
  await form.getByLabel("To Account").selectOption(bank.id);
  await form.getByRole("button", { name: "Record Transfer" }).click();
  await expect(form.getByText("Source and destination accounts must be different")).toBeVisible();
  await form.getByLabel("To Account").selectOption(cash.id);
  const transferred = page.waitForResponse((response) => posted(response, "/api/v1/transactions/"));
  await form.getByRole("button", { name: "Record Transfer" }).click();
  const transferResponse = await transferred;
  const transfer = await confirmUiWrite(transferResponse, "/api/v1/transactions/");
  await expect(page.getByRole("heading", { name: "Quick Add Transaction" })).not.toBeVisible();
  expect((await get(`/api/v1/accounts/${bank.id}/`)).balance).toBe("10.70");
  expect((await get(`/api/v1/accounts/${cash.id}/`)).balance).toBe("1.01");
  expect(await summary()).toEqual({
    liquid_balance: "11.71",
    personal_expense: "0.29",
    external_receipts: "2.00",
  });

  await openResource(page, `/transactions/${expense.id}`, `/api/v1/transactions/${expense.id}/`);
  await expect(page.getByText("Ledger Postings Breakdown")).toBeVisible();
  await page.getByRole("button", { name: "Record Reversal / Correction" }).click();
  await page.getByRole("button", { name: "Correct", exact: true }).click();
  await page.getByLabel("Audit Reason").fill("Part2 correct exact amount");
  await page.getByLabel("Corrected amount", { exact: true }).fill("0.19");
  const corrected = page.waitForResponse((response) =>
    posted(response, `/api/v1/transactions/${expense.id}/correct/`)
  );
  await page.getByRole("button", { name: "Save Correction" }).click();
  const correctedResponse = await corrected;
  const replacement = await confirmUiWrite(
    correctedResponse,
    `/api/v1/transactions/${expense.id}/correct/`
  );
  expect(replacement.supersedes).toBe(expense.id);
  expect(replacement.amount).toBe("0.19");
  const original = await get(`/api/v1/transactions/${expense.id}/`);
  expect(original.amount).toBe("0.29");
  expect(original.status).toBe("reversed");
  await openResource(
    page,
    `/transactions/${replacement.id}`,
    `/api/v1/transactions/${replacement.id}/`
  );
  await page.getByRole("button", { name: "Record Reversal / Correction" }).click();
  await page.getByRole("button", { name: "Void", exact: true }).click();
  await page.getByLabel("Audit Reason").fill("Part2 void corrected expense");
  const voided = page.waitForResponse((response) =>
    posted(response, `/api/v1/transactions/${replacement.id}/void/`)
  );
  await page.getByRole("button", { name: "Void Transaction" }).click();
  await confirmUiWrite(await voided, `/api/v1/transactions/${replacement.id}/void/`);
  expect((await get(`/api/v1/transactions/${replacement.id}/`)).status).toBe("voided");
  await write(`/api/v1/transactions/${transfer.id}/reverse/`, { reason: "Part2 reverse transfer" });
  await write(`/api/v1/transactions/${receipt.id}/reverse/`, { reason: "Part2 reverse receipt" });
  expect(await summary()).toEqual({
    liquid_balance: "10.00",
    personal_expense: "0.00",
    external_receipts: "0.00",
  });

  console.log(
    "Part 2 real integration: received, expense, transfer, correction, void and reversal confirmed."
  );
  const base = {
    kind: "expense",
    account: bank.id,
    category: category.id,
    effective_date: date,
    title: `Part2 rejected ${run}`,
  };
  for (const [amount, status] of [
    ["0.001", 400],
    ["0.00", 400],
    ["-1.00", 400],
    ["999.00", 409],
  ] as const) {
    const response = await api.post(`${frontendOrigin}/api/v1/transactions/`, {
      data: { ...base, amount },
      headers: await headers(),
    });
    expect(response.status()).toBe(status);
  }
  const missingCSRF = await api.post(`${frontendOrigin}/api/v1/transactions/`, {
    data: { ...base, amount: "0.01" },
    headers: { Origin: frontendOrigin, "Idempotency-Key": randomUUID() },
  });
  expect(missingCSRF.status()).toBe(403);
  const untrusted = await api.post(`${frontendOrigin}/api/v1/transactions/`, {
    data: { ...base, amount: "0.01" },
    headers: { ...(await headers()), Origin: "https://untrusted.example" },
  });
  expect(untrusted.status()).toBe(403);
  const foreign = await api.get(
    `${frontendOrigin}/api/v1/accounts/${process.env.KIVO_E2E_ACCOUNT_A}/`
  );
  expect(foreign.status()).toBe(404);
  const missingKey = await api.post(`${frontendOrigin}/api/v1/transactions/`, {
    data: { ...base, amount: "0.01" },
    headers: { Origin: frontendOrigin, "X-CSRFToken": (await headers())["X-CSRFToken"] },
  });
  expect(missingKey.status()).toBe(400);
  const secondUser = await playwrightRequest.newContext({
    storageState: ".playwright-auth/session.json",
  });
  for (const path of [
    `accounts/${bank.id}/`,
    `categories/${category.id}/`,
    `transactions/${expense.id}/`,
  ])
    expect((await secondUser.get(`${frontendOrigin}/api/v1/${path}`)).status()).toBe(404);
  expect(
    (await secondUser.get(`${frontendOrigin}/api/v1/transactions/?account=${bank.id}`)).status()
  ).toBe(200);
  expect(
    (
      await (
        await secondUser.get(`${frontendOrigin}/api/v1/transactions/?account=${bank.id}`)
      ).json()
    ).count
  ).toBe(0);
  const secondState = await secondUser.storageState();
  const secondHeaders = {
    Origin: frontendOrigin,
    "X-CSRFToken": secondState.cookies.find((cookie) => cookie.name === "csrftoken")!.value,
    "Idempotency-Key": randomUUID(),
  };
  expect(
    (
      await secondUser.post(`${frontendOrigin}/api/v1/transactions/`, {
        data: { ...base, amount: "0.01" },
        headers: secondHeaders,
      })
    ).status()
  ).toBe(404);
  expect(
    (
      await secondUser.post(`${frontendOrigin}/api/v1/transactions/${expense.id}/reverse/`, {
        data: { reason: "Part2 forbidden foreign reversal" },
        headers: { ...secondHeaders, "Idempotency-Key": randomUUID() },
      })
    ).status()
  ).toBe(404);
  expect(
    (
      await secondUser.patch(`${frontendOrigin}/api/v1/categories/${category.id}/`, {
        data: { archived: true },
        headers: secondHeaders,
      })
    ).status()
  ).toBe(404);
  await secondUser.dispose();

  // Lose only the browser response after a real Django commit; do not fabricate a success payload.
  await page.goto("/transactions");
  form = await quickAdd("Expense");
  await form.getByLabel(/Amount/).fill("0.03");
  await form.getByLabel("Description / Title").fill(`Part2 ambiguous ${run}`);
  await form.getByLabel(/^Category/).selectOption(category.id);
  await form.getByLabel("Payment Account").selectOption(bank.id);
  let committedId = "";
  let firstKey = "";
  await page.route("**/api/v1/transactions/", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    firstKey = route.request().headers()["idempotency-key"];
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    committedId = (await response.json()).id;
    await route.abort("failed");
  });
  await form.getByRole("button", { name: "Record Expense" }).dblclick();
  await expect(page.getByRole("button", { name: "Check server status" })).toBeVisible({
    timeout: 20_000,
  });
  await page.unroute("**/api/v1/transactions/");
  await page.reload();
  await page.getByRole("button", { name: "Quick Add", exact: true }).click();
  await expect(page.getByRole("button", { name: "Record Expense" })).toBeDisabled();
  await page.getByRole("button", { name: "Check server status" }).click();
  const replayed = page.waitForResponse((response) => posted(response, "/api/v1/transactions/"));
  const retryRequest = page.waitForRequest(
    (request) =>
      new URL(request.url()).pathname.replace(/\/$/, "") === "/api/v1/transactions" &&
      request.method() === "POST"
  );
  await page.getByRole("button", { name: "Retry original request" }).click();
  const replayResponse = await replayed;
  expect(replayResponse.status()).toBe(200);
  expect((await replayResponse.json()).id).toBe(committedId);
  expect((await (await retryRequest).allHeaders())["idempotency-key"]).toBe(firstKey);
  await expect(page.getByRole("heading", { name: "Quick Add Transaction" })).not.toBeVisible();
  expect((await get(`/api/v1/transactions/?search=Part2%20ambiguous%20${run}`)).count).toBe(1);
  const conflict = await api.post(`${frontendOrigin}/api/v1/transactions/`, {
    data: { ...base, amount: "0.04" },
    headers: await headers(firstKey),
  });
  expect(conflict.status()).toBe(409);

  // Six identifiable revisions exercise correction chains and cross the actual 20-row page size.
  let revisionId = committedId;
  for (let index = 0; index < 6; index++) {
    const revision = await write(`/api/v1/transactions/${revisionId}/correct/`, {
      ...base,
      amount: "0.03",
      title: `Part2 pagination ${run} ${index}`,
      reason: `Part2 pagination audit revision ${index}`,
    });
    expect(revision.supersedes).toBe(revisionId);
    revisionId = revision.id;
  }
  const history = await get(`/api/v1/transactions/?account=${bank.id}&period=all&sort=highest`);
  expect(history.count).toBe(22);
  expect(history.results).toHaveLength(20);
  expect(history.next).not.toBeNull();
  const second = await get(
    `/api/v1/transactions/?account=${bank.id}&period=all&sort=highest&page=2`
  );
  expect(second.results).toHaveLength(2);
  expect(
    new Set([...history.results, ...second.results].map((row: { id: string }) => row.id)).size
  ).toBe(22);
  const filtered = await get(
    `/api/v1/transactions/?kind=expense&category=${category.id}&date_from=${date}&date_to=${date}&amount_min=0.03&amount_max=0.03&search=pagination&sort=oldest`
  );
  expect(filtered.count).toBe(6);
  await page.goto(`/transactions?account=${bank.id}`);
  const firstPageLoaded = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname.replace(/\/$/, "") === "/api/v1/transactions" &&
      url.searchParams.get("period") === "all" &&
      url.searchParams.get("account") === bank.id &&
      url.searchParams.get("page") === "1" &&
      response.status() !== 308
    );
  });
  await page.getByRole("button", { name: "All Time", exact: true }).click();
  const firstPageResponse = await firstPageLoaded;
  expect(firstPageResponse.status()).toBe(200);
  expect((await firstPageResponse.json()).count).toBe(22);
  await expect(page.getByText("Page 1 of 2")).toBeVisible();
  const secondPageLoaded = page.waitForResponse(
    (response) =>
      new URL(response.url()).searchParams.get("page") === "2" &&
      new URL(response.url()).pathname.replace(/\/$/, "") === "/api/v1/transactions" &&
      response.status() !== 308
  );
  await page.getByRole("button", { name: "Next", exact: true }).click();
  const secondPageResponse = await secondPageLoaded;
  expect(secondPageResponse.status()).toBe(200);
  expect((await secondPageResponse.json()).results).toHaveLength(2);
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  expect(await summary()).toEqual({
    liquid_balance: "9.97",
    personal_expense: "0.03",
    external_receipts: "0.00",
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Transaction Activity" })).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
  expect((await api.get(`${frontendOrigin}/api/v1/transactions/`)).status()).toBe(401);
  const loginForm = page.locator("form:visible");
  await loginForm.getByLabel(/Email address/i).fill(process.env.KIVO_E2E_EMAIL_A!);
  await loginForm.getByLabel(/^Password/i).fill(process.env.KIVO_E2E_PASSWORD!);
  await loginForm.getByRole("button", { name: /Sign In/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  await page.goto("/transactions");
  const isolationSearch = `Part2 pagination ${run}`;
  const isolatedHistory = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname.replace(/\/$/, "") === "/api/v1/transactions" &&
      url.searchParams.get("search") === isolationSearch &&
      response.request().method() === "GET" &&
      response.status() !== 308
    );
  });
  await page.getByPlaceholder(/Search title, merchant, notes/i).fill(isolationSearch);
  const isolatedResponse = await isolatedHistory;
  expect(isolatedResponse.status()).toBe(200);
  expect((await isolatedResponse.json()).count).toBe(0);
  await expect(page.getByText("No Matching Transactions")).toBeVisible();
  expect((await api.get(`${frontendOrigin}/api/v1/accounts/${bank.id}/`)).status()).toBe(404);
  console.log(
    "Part 2 real integration: exact final Django summary, pagination, response-loss replay, CSRF and two-user isolation confirmed."
  );
});
