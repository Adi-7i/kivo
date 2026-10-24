import { request, expect } from "@playwright/test";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, chmod } from "node:fs/promises";
import { authPost, backendOrigin, csrf, frontendOrigin } from "./live-api";

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
  await context.storageState({ path: ".playwright-auth/session.json" });
  await chmod(".playwright-auth/session.json", 0o600);
  await context.dispose();
}
