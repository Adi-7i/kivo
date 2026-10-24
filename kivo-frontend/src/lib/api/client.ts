import { API_BASE_URL } from "../config/env";
import { getCsrfToken } from "./csrf";
import { normalizeHttpError, normalizeError } from "./errors";
import type { RequestOptions } from "@/types/api";

let csrfBootstrap: Promise<unknown> | null = null;

/** Bootstrap Django's cookie only when missing; always reread it after rotation. */
async function ensureCsrf(): Promise<void> {
  if (getCsrfToken()) return;
  csrfBootstrap ??= apiClient("/api/v1/auth/csrf/", { skipCsrf: true });
  try {
    await csrfBootstrap;
  } finally {
    csrfBootstrap = null;
  }
  if (!getCsrfToken())
    throw new Error("The CSRF cookie is unavailable. Check your browser cookie settings.");
}

/** Same-origin, no-store Fetch transport. Mutations are never retried here. */
export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = "GET",
    body,
    params,
    timeoutMs = 15000,
    skipCsrf = false,
    idempotencyKey,
    headers: customHeaders,
    ...fetchInit
  } = options;

  if (!endpoint.startsWith("/api/v1/") || endpoint.includes("\\") || endpoint.includes("..")) {
    throw new Error("API requests must use a local /api/v1/ path.");
  }
  let url = `${API_BASE_URL}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const headers = new Headers(customHeaders);
  headers.set("Accept", "application/json");

  if (body !== undefined && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (!skipCsrf && ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase())) {
    await ensureCsrf();
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers.set("X-CSRFToken", csrfToken);
    }
  }

  if (idempotencyKey) {
    headers.set("Idempotency-Key", idempotencyKey);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchInit,
      method,
      headers,
      credentials: "same-origin",
      cache: "no-store",
      signal: fetchInit.signal
        ? AbortSignal.any([controller.signal, fetchInit.signal])
        : controller.signal,
      body:
        body !== undefined ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
    });

    if (!response.ok) {
      let errorPayload: unknown;
      try {
        errorPayload = await response.json();
      } catch {
        errorPayload = { detail: response.statusText };
      }
      if (
        response.status === 401 &&
        endpoint !== "/api/v1/auth/me/" &&
        typeof window !== "undefined"
      ) {
        window.dispatchEvent(new Event("kivo:session-expired"));
      }
      throw normalizeHttpError(response.status, errorPayload);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    throw normalizeError(error);
  } finally {
    clearTimeout(timeoutId);
  }
}
