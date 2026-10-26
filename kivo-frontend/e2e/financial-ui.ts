import { expect, type Page, type Response } from "@playwright/test";
import { posted } from "./live-api";
/** Test the deliberate recovery UI after an actual ambiguous response; never make a new-key POST. */
export async function confirmUiFinancial(page: Page, response: Response, path: string) {
  if (response.status() < 500 && response.status() !== 408) {
    expect([200, 201]).toContain(response.status());
    return response.json();
  }
  let original = response.request();
  while (original.redirectedFrom()) original = original.redirectedFrom()!;
  const key = (await original.allHeaders())["idempotency-key"],
    body = original.postDataJSON();
  expect(key).toBeTruthy();
  await page.getByRole("button", { name: "Check request status", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Retry original request", exact: true })
  ).toBeVisible({ timeout: 25_000 });
  const method = original.method();
  const reply = page.waitForResponse((r) => posted(r, path, method), { timeout: 30_000 });
  const request = page.waitForRequest(
    (r) =>
      r.method() === method &&
      new URL(r.url()).pathname.replace(/\/$/, "") === path.replace(/\/$/, "")
  );
  await page.getByRole("button", { name: "Retry original request", exact: true }).click();
  const retried = await request,
    confirmed = await reply;
  expect((await retried.allHeaders())["idempotency-key"]).toBe(key);
  expect(retried.postDataJSON()).toEqual(body);
  expect([200, 201]).toContain(confirmed.status());
  console.log(
    `Explicit UI recovery after actual HTTP ${response.status()}; original key/body, confirmed ${confirmed.status()}.`
  );
  return confirmed.json();
}
