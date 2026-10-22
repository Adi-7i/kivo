export class KivoApiError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly payload?: unknown;

  constructor(status: number, message: string, code?: string, payload?: unknown) {
    super(message);
    this.name = "KivoApiError";
    this.status = status;
    this.code = code;
    this.payload = payload;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UnauthorizedError extends KivoApiError {
  constructor(message: string = "Authentication required", code?: string, payload?: unknown) {
    super(401, message, code, payload);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends KivoApiError {
  constructor(message: string = "Access forbidden", code?: string, payload?: unknown) {
    super(403, message, code, payload);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends KivoApiError {
  constructor(message: string = "Resource not found", code?: string, payload?: unknown) {
    super(404, message, code, payload);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends KivoApiError {
  public readonly fieldErrors: Record<string, string[]>;

  constructor(
    fieldErrors: Record<string, string[]> = {},
    message: string = "Validation failed",
    code?: string,
    payload?: unknown
  ) {
    super(400, message, code, payload);
    this.name = "ValidationError";
    this.fieldErrors = fieldErrors;
  }
}

export class ServerError extends KivoApiError {
  constructor(message: string = "Internal server error", code?: string, payload?: unknown) {
    super(500, message, code, payload);
    this.name = "ServerError";
  }
}

export class TimeoutError extends KivoApiError {
  constructor(message: string = "Request timed out", code?: string, payload?: unknown) {
    super(408, message, code, payload);
    this.name = "TimeoutError";
  }
}

export class NetworkError extends KivoApiError {
  constructor(message: string = "Network request failed", code?: string, payload?: unknown) {
    super(0, message, code, payload);
    this.name = "NetworkError";
  }
}

export function normalizeHttpError(status: number, payload?: unknown): KivoApiError {
  const record = (value: unknown): Record<string, unknown> =>
    value !== null && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const outer = record(payload);
  const envelope = outer.error ? record(outer.error) : outer;
  const errPayload = envelope.details ? record(envelope.details) : envelope;
  const firstMessage = (value: unknown): string | undefined =>
    typeof value === "string"
      ? value
      : Array.isArray(value) && typeof value[0] === "string"
        ? value[0]
        : undefined;
  const detail =
    firstMessage(errPayload.detail) ||
    firstMessage(envelope.message) ||
    firstMessage(errPayload.non_field_errors);
  const code =
    typeof envelope.type === "string"
      ? envelope.type
      : typeof errPayload.code === "string"
        ? errPayload.code
        : undefined;

  switch (status) {
    case 401:
      return new UnauthorizedError(detail || "Authentication required", code, payload);
    case 403:
      return new ForbiddenError(detail || "Access forbidden", code, payload);
    case 404:
      return new NotFoundError(detail || "Resource not found", code, payload);
    case 400: {
      const fieldErrors: Record<string, string[]> = {};
      if (errPayload && typeof errPayload === "object") {
        for (const [key, val] of Object.entries(errPayload)) {
          if (key === "detail" || key === "code" || key === "message") continue;
          if (Array.isArray(val)) {
            fieldErrors[key] = val.map(String);
          } else if (typeof val === "string") {
            fieldErrors[key] = [val];
          }
        }
      }
      return new ValidationError(fieldErrors, detail || "Validation failed", code, payload);
    }
    case 500:
      return new ServerError(detail || "Internal server error", code, payload);
    case 409:
      return new KivoApiError(
        status,
        detail || "This request conflicts with an existing operation.",
        code,
        payload
      );
    case 429:
      return new KivoApiError(
        status,
        detail || "Too many attempts. Please wait before trying again.",
        code,
        payload
      );
    default:
      return new KivoApiError(
        status,
        detail ||
          (status >= 500
            ? "The service is temporarily unavailable. Please try again later."
            : `Request failed with status ${status}`),
        code,
        payload
      );
  }
}

export function normalizeError(err: unknown): KivoApiError {
  if (err instanceof KivoApiError) {
    return err;
  }

  if (err instanceof DOMException && err.name === "AbortError") {
    return new TimeoutError("Request timed out");
  }

  if (err instanceof TypeError && /fetch/i.test(err.message)) {
    return new NetworkError("Failed to fetch");
  }

  const message = err instanceof Error ? err.message : "An unexpected error occurred";
  return new KivoApiError(500, message);
}
