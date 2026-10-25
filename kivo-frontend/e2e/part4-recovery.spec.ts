import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { frontendOrigin, posted } from "./live-api";
import { confirmUiFinancial } from "./financial-ui";

test("real committed loan response loss survives refresh and deliberate original-key replay", async ({
  page,
  context,
}) => {
  test.setTimeout(180_000);
  const title = `p4-response-loss-${randomUUID()}`;
  await page.goto("/people");
  await page.getByRole("button", { name: "Lend", exact: true }).click();
  await page.locator("#loan-contact").selectOption(process.env.KIVO_E2E_CONTACT_A!);
  await page.locator("#loan-account").selectOption(process.env.KIVO_E2E_ACCOUNT_A!);
  await page.locator("#loan-amount").fill("0.01");
  await page.locator("#loan-title").fill(title);
  let id = "",
    key = "",
    body: unknown;
  // Fetch the real Django result, then lose only its browser response. No mocked success data.
  await page.route("**/api/v1/loans/", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    key = route.request().headers()["idempotency-key"];
    body = route.request().postDataJSON();
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    id = (await response.json()).id;
    await route.abort("failed");
  });
  await page.getByRole("button", { name: "Record Lent Money", exact: true }).dblclick();
  await expect(
    page.getByRole("button", { name: "Check server status", exact: true })
  ).toBeVisible();
  await page.unroute("**/api/v1/loans/");
  await page.reload();
  await page.getByRole("button", { name: "Lend", exact: true }).click();
  await expect(page.getByRole("button", { name: "Record Lent Money", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Check server status", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Retry original request", exact: true })
  ).toBeVisible();
  const sent = page.waitForRequest(
    (r) => r.method() === "POST" && new URL(r.url()).pathname.replace(/\/$/, "") === "/api/v1/loans"
  );
  const replied = page.waitForResponse((r) => posted(r, "/api/v1/loans/"));
  await page.getByRole("button", { name: "Retry original request", exact: true }).click();
  const request = await sent,
    response = await replied;
  expect(response.status()).toBe(200);
  expect((await response.json()).id).toBe(id);
  expect((await request.allHeaders())["idempotency-key"]).toBe(key);
  expect(request.postDataJSON()).toEqual(body);
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const rows = await context.request.get(`${frontendOrigin}/api/v1/loans/`);
  expect(rows.status()).toBe(200);
  expect(
    (await rows.json()).results.filter((e: { title: string }) => e.title === title)
  ).toHaveLength(1);
  await page
    .getByTestId(`event-${id}`)
    .getByRole("button", { name: "Reverse", exact: true })
    .click();
  await page
    .getByLabel("Audit Reason", { exact: true })
    .fill("Controlled Part 4 response loss verification");
  const reversed = page.waitForResponse((r) => posted(r, `/api/v1/loans/${id}/reverse/`));
  await page.getByRole("button", { name: "Confirm Reversal", exact: true }).click();
  await confirmUiFinancial(page, await reversed, `/api/v1/loans/${id}/reverse/`);
});
