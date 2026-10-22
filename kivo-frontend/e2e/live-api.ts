import { expect, type APIRequestContext } from "@playwright/test";

export const frontendOrigin = "http://localhost:3001";
export const backendOrigin = "http://127.0.0.1:8000";

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
