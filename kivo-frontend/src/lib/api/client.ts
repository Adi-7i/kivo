import { API_BASE_URL } from "../config/env";
import { getCsrfToken } from "./csrf";
import { normalizeHttpError, normalizeError } from "./errors";
import type { RequestOptions } from "@/types/api";

/**
 * Base fetch client for Django REST API communication.
 * Note: Under Phase 3 strict UI guidelines, backend operations are deferred
 * and UI interactions display integration-pending states.
 */
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

  let url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;

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
      method,
      headers,
      credentials: "include",
      signal: controller.signal,
      body:
        body !== undefined ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
      ...fetchInit,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorPayload: unknown;
      try {
        errorPayload = await response.json();
      } catch {
        errorPayload = { detail: response.statusText };
      }
      throw normalizeHttpError(response.status, errorPayload);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    clearTimeout(timeoutId);
    throw normalizeError(error);
  }
}
