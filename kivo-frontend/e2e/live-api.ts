import { expect, type APIRequestContext, type Response, type Page } from "@playwright/test";

export const frontendOrigin = "http://localhost:3001";
export const backendOrigin = "http://127.0.0.1:8000";

/** Ignore Next's trailing-slash redirect; assert the actual Django response. */
export function posted(response: Response, path: string, method = "POST"): boolean {
  return (
    new URL(response.url()).pathname.replace(/\/$/, "") === path.replace(/\/$/, "") &&
    response.request().method() === method &&
    response.status() !== 308
  );
}

export async function openResource(page: Page, path: string, resource: string): Promise<void> {
  const loaded = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname.replace(/\/$/, "") === resource.replace(/\/$/, "") &&
      response.request().method() === "GET" &&
      response.status() !== 308,
    // Navigation first verifies the Django session, then hydrates the owned query.
    // Observe both bounded requests; application HTTP deadlines stay unchanged.
    { timeout: 40_000 }
  );
  await page.goto(path);
  expect((await loaded).status()).toBe(200);
}

export async function csrf(context: APIRequestContext): Promise<string> {
  expect((await context.get(`${frontendOrigin}/api/v1/auth/csrf/`)).status()).toBe(200);
  const state = await context.storageState();
  const token = state.cookies.find((cookie) => cookie.name === "csrftoken")?.value;
  if (!token) throw new Error("Django did not issue a CSRF cookie");
  return token;
}

/** Retry only a confirmed throttle rejection, never a timeout or financial write. */
export async function authPost(context: APIRequestContext, path: string, data: object) {
  const send = async () =>
    context.post(`${frontendOrigin}${path}`, {
      data,
      headers: { Origin: frontendOrigin, "X-CSRFToken": await csrf(context) },
    });
  let response = await send();
  if (response.status() === 429) {
    const seconds = Number(response.headers()["retry-after"] || "60");
    if (!Number.isFinite(seconds) || seconds > 65) throw new Error("Unexpected throttle duration");
    await new Promise((resolve) => setTimeout(resolve, (Math.max(1, seconds) + 1) * 1000));
    response = await send();
  }
  return response;
}
