import { describe, it, expect } from "vitest";
import {
  normalizeHttpError,
  normalizeError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  ServerError,
  TimeoutError,
  NetworkError,
  KivoApiError,
} from "@/lib/api/errors";

describe("normalizeHttpError", () => {
  it("maps 401 to UnauthorizedError", () => {
    const error = normalizeHttpError(401, { detail: "Authentication required" });
    expect(error).toBeInstanceOf(UnauthorizedError);
    expect(error.status).toBe(401);
    expect(error.message).toBe("Authentication required");
  });

  it("maps 403 to ForbiddenError", () => {
    const error = normalizeHttpError(403);
    expect(error).toBeInstanceOf(ForbiddenError);
    expect(error.status).toBe(403);
  });

  it("maps 404 to NotFoundError", () => {
    const error = normalizeHttpError(404);
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.status).toBe(404);
  });

  it("maps 400 with field errors to ValidationError", () => {
    const payload = {
      email: ["Enter a valid email address."],
      amount: ["Amount cannot be negative."],
    };
    const error = normalizeHttpError(400, payload);
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).fieldErrors.email).toEqual(["Enter a valid email address."]);
    expect((error as ValidationError).fieldErrors.amount).toEqual(["Amount cannot be negative."]);
  });

  it("maps 500 to ServerError", () => {
    const error = normalizeHttpError(500);
    expect(error).toBeInstanceOf(ServerError);
    expect(error.status).toBe(500);
  });

  it("maps unknown 4xx to KivoApiError", () => {
    const error = normalizeHttpError(418);
    expect(error).toBeInstanceOf(KivoApiError);
    expect(error.status).toBe(418);
  });
});

describe("normalizeError", () => {
  it("preserves already normalized KivoApiError instances", () => {
    const original = new UnauthorizedError("Session expired");
    expect(normalizeError(original)).toBe(original);
  });

  it("normalizes DOMException AbortError to TimeoutError", () => {
    const abortErr = new DOMException("Request timed out", "AbortError");
    const error = normalizeError(abortErr);
    expect(error).toBeInstanceOf(TimeoutError);
  });

  it("normalizes fetch TypeError to NetworkError", () => {
    const fetchErr = new TypeError("Failed to fetch");
    const error = normalizeError(fetchErr);
    expect(error).toBeInstanceOf(NetworkError);
  });
});
