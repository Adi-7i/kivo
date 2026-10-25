import { request, expect } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, chmod } from "node:fs/promises";
import { authPost, backendOrigin, csrf, frontendOrigin } from "./live-api";
import { todayInKolkata } from "../src/features/onboarding/money";

export default async function setup() {
  if (process.env.KIVO_ALLOW_DEV_TEST_RECORDS !== "1") {
    throw new Error(
      "Real E2E requires KIVO_ALLOW_DEV_TEST_RECORDS=1 and the approved development Django server. It creates identifiable users/opening accounts and never cleans them up destructively."
    );
  }
  const probe = await request.newContext();
  expect((await probe.get(`${backendOrigin}/api/v1/health/db/`)).status()).toBe(200);
  await probe.dispose();
  const run = `${Date.now()}-${randomUUID().slice(0, 6)}`;
  process.env.KIVO_E2E_RUN = run;
  process.env.KIVO_E2E_PASSWORD = `${randomBytes(24).toString("base64url")}!a7`;
  process.env.KIVO_E2E_EMAIL_A = `kivo-integration-${run}-a@example.test`;
  process.env.KIVO_E2E_EMAIL_B = `kivo-integration-${run}-b@example.test`;
  process.env.KIVO_E2E_NAME_A = `Kivo Integration A ${run}`;
  await mkdir(".playwright-auth", { recursive: true, mode: 0o700 });
  await chmod(".playwright-auth", 0o700);
  const context = await request.newContext();
  for (const [email, name] of [[process.env.KIVO_E2E_EMAIL_A, process.env.KIVO_E2E_NAME_A]]) {
    const response = await authPost(context, "/api/v1/auth/register/", {
      email,
      name,
      password: process.env.KIVO_E2E_PASSWORD,
    });
    expect(response.status()).toBe(201);
  }
  // Registration must not establish a session.
  expect((await context.get(`${frontendOrigin}/api/v1/auth/me/`)).status()).toBe(401);
  expect(
    (
      await authPost(context, "/api/v1/auth/login/", {
        email: process.env.KIVO_E2E_EMAIL_A,
        password: process.env.KIVO_E2E_PASSWORD,
      })
    ).status()
  ).toBe(200);
  const input = {
    name: `Integration baseline ${run}`,
    kind: "cash",
    opened_on: "2026-10-22",
    opening_balance: "123.45",
  };
  const account = await context.post(`${frontendOrigin}/api/v1/accounts/`, {
    data: input,
    headers: {
      Origin: frontendOrigin,
      "X-CSRFToken": await csrf(context),
      "Idempotency-Key": randomUUID(),
    },
  });
  let body;
  if (account.status() === 201 || account.status() === 200) {
    body = await account.json();
  } else if (account.status() >= 500) {
    // A proxy deadline can expire after a commit. Reconcile by GET; never replay the POST.
    await expect
      .poll(
        async () => {
          const response = await context.get(`${frontendOrigin}/api/v1/accounts/`);
          if (!response.ok()) return false;
          const state = await response.json();
          body = state.results.find((value: { name: string }) => value.name === input.name);
          return state.count === 1 && body?.opening_balance === input.opening_balance;
        },
        { timeout: 15_000 }
      )
      .toBe(true);
    console.log(
      `Development fixture: HTTP ${account.status()} write reconciled by account GET; no POST retry.`
    );
  } else {
    throw new Error(`Fixture account creation rejected with HTTP ${account.status()}`);
  }
  expect(body.balance).toBe("123.45");
  process.env.KIVO_E2E_ACCOUNT_A = body.id;
  const history = await context.get(`${frontendOrigin}/api/v1/transactions/?account=${body.id}`);
  expect(history.status()).toBe(200);
  const opening = (await history.json()).results[0];
  expect(opening.kind).toBe("opening");
  process.env.KIVO_E2E_OPENING_EVENT = opening.id;
  const funding = await context.get(`${frontendOrigin}/api/v1/funds/batches/`);
  expect(funding.status()).toBe(200);
  const batch = (await funding.json()).results.find(
    (row: { source_event: string }) => row.source_event === opening.id
  );
  expect(batch?.remaining_capacity).toBe("123.45");
  process.env.KIVO_E2E_FUND_A = batch.id;
  process.env.KIVO_E2E_FUND_NAME_A = batch.funding_source || "Opening equity";
  // Supported Django fixture writes only; the Part 4 lifecycle separately exercises the UI.
  // Keep the original funding assertion above before any small controlled shared expense.
  const seed = async (path: string, data: object) => {
    const token = await csrf(context);
    const state = await context.storageState();
    const response = await context.post(`${backendOrigin}/api/v1/${path}/`, {
      data,
      timeout: 60_000,
      headers: {
        Origin: frontendOrigin,
        "X-CSRFToken": token,
        "Idempotency-Key": randomUUID(),
        Cookie: state.cookies
          .filter((c) => ["sessionid", "csrftoken"].includes(c.name))
          .map((c) => `${c.name}=${c.value}`)
          .join("; "),
      },
    });
    expect(response.status(), `Unconfirmed ${path} fixture; no automatic retry`).toBe(201);
    return response.json();
  };
  const contact = await seed("contacts", {
    display_name: `Integration friend ${run}`,
    notes: "Part 4 browser fixture",
  });
  const category = await seed("categories", { name: `Integration shared ${run}` });
  const bill = await seed("shared-bills", {
    title: `Integration shared bill ${run}`,
    amount: "0.10",
    category: category.id,
    effective_date: "2026-10-24",
    account: body.id,
    payer: null,
    split_method: "custom",
    participants: [
      { contact: null, amount: "0.05" },
      { contact: contact.id, amount: "0.05" },
    ],
  });
  process.env.KIVO_E2E_CONTACT_A = contact.id;
  process.env.KIVO_E2E_CONTACT_NAME_A = contact.display_name;
  process.env.KIVO_E2E_BILL_A = bill.id;
  process.env.KIVO_E2E_BILL_TITLE_A = bill.event.title;
  process.env.KIVO_E2E_CATEGORY_A = category.id;
  const date = todayInKolkata();
  const plan = await seed("rent/plans", {
    title: `Integration rent ${run}`,
    payee: `Development landlord ${run}`,
    start_date: date.slice(0, 7) + "-01",
    due_day: null,
    amount: "0.10",
    category: category.id,
    split_method: "equal",
    participants: [{ contact: null }],
  });
  const monthEnd = new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0))
    .toISOString()
    .slice(0, 10);
  await seed(`rent/plans/${plan.id}/generate`, { through: monthEnd });
  const obligations = await context.get(
    `${frontendOrigin}/api/v1/rent/plans/${plan.id}/obligations/`
  );
  expect(obligations.status()).toBe(200);
  const obligation = (await obligations.json()).results[0];
  const reserve = await seed("rent/reserves", {
    obligation: obligation.id,
    label: `Integration reserve ${run}`,
    amount: "0.05",
    reason: "Identifiable rent regression fixture",
  });
  process.env.KIVO_E2E_RENT_PLAN_A = plan.id;
  process.env.KIVO_E2E_RENT_NAME_A = plan.title;
  process.env.KIVO_E2E_RENT_OBLIGATION_A = obligation.id;
  process.env.KIVO_E2E_RENT_RESERVE_A = reserve.id;
  const budgetMonth = date.slice(0, 7) + "-01";
  const overallBudget = await seed("budgets", {
    name: "Integration overall " + run,
    period_start: budgetMonth,
    period_end: monthEnd,
    limit: "1.00",
    warning_percent: 50,
  });
  const categoryBudget = await seed("budgets", {
    name: "Integration category " + run,
    category: category.id,
    period_start: budgetMonth,
    period_end: monthEnd,
    limit: "0.05",
    warning_percent: 50,
  });
  process.env.KIVO_E2E_BUDGET_A = overallBudget.id;
  process.env.KIVO_E2E_CATEGORY_BUDGET_A = categoryBudget.id;
  process.env.KIVO_E2E_BUDGET_NAME_A = overallBudget.name;
  await context.storageState({ path: ".playwright-auth/session.json" });
  await chmod(".playwright-auth/session.json", 0o600);
  await context.dispose();
}
