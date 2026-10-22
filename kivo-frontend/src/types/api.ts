/**
 * Core API response envelopes and generic types for Kivo.
 *
 * NOTE: These are generic transport envelopes. Domain-specific DTOs
 * are generated via OpenAPI or defined per-feature in subsequent phases.
 */

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiErrorPayload {
  detail?: string;
  code?: string;
  message?: string;
  errors?: Record<string, string[] | string>;
  [key: string]: unknown;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export interface RequestOptions extends Omit<RequestInit, "method" | "body"> {
  method?: HttpMethod;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  timeoutMs?: number;
  skipCsrf?: boolean;
  idempotencyKey?: string;
}
