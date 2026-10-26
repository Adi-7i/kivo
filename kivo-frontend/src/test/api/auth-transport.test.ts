import { describe, it, expect, vi } from "vitest";
import { apiClient } from "@/lib/api/client";
import { normalizeHttpError, ValidationError, TimeoutError } from "@/lib/api/errors";
import { safeReturnPath } from "@/features/auth/navigation";
import { normalizeOpeningBalance } from "@/features/onboarding/money";
import { accountSchema } from "@/features/onboarding/schemas/account.schema";

describe("authentication transport (mocked HTTP)", () => {
  it("bootstraps CSRF when missing and sends the current cookie with a same-origin write", async () => {
    document.cookie = "csrftoken=; Max-Age=0; path=/";
    vi.mocked(fetch).mockImplementation(async (url) => {
      if (String(url).endsWith("/csrf/")) document.cookie = "csrftoken=rotated-value; path=/";
      return Response.json({ id: 1 });
    });
    await apiClient("/api/v1/auth/login/", {
      method: "POST",
      body: { email: "test@example.com", password: "unlogged-password" },
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    const options = vi.mocked(fetch).mock.calls[1][1]!;
    expect((options.headers as Headers).get("X-CSRFToken")).toBe("rotated-value");
    expect(options.credentials).toBe("same-origin");
    expect(options.cache).toBe("no-store");
  });
  it("never sends cookies to arbitrary absolute API endpoints", async () => {
    await expect(apiClient("https://outside.example/api/v1/auth/me/")).rejects.toThrow(/local/);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("times out a pending write without retrying it", async () => {
    vi.mocked(fetch).mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError"))
          );
        })
    );
    await expect(
      apiClient("/api/v1/accounts/", { method: "POST", body: {}, timeoutMs: 5 })
    ).rejects.toBeInstanceOf(TimeoutError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("normalizes Django's nested field and API errors", () => {
    const error = normalizeHttpError(400, {
      error: { status_code: 400, type: "validation_error", details: { email: ["Already exists"] } },
    });
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).fieldErrors.email).toEqual(["Already exists"]);
    for (const status of [401, 403, 409, 429, 500, 503])
      expect(normalizeHttpError(status).status).toBe(status);
  });
});

describe("safe input boundaries", () => {
  it.each([
    "//evil.example",
    "https://evil.example",
    "/\\evil",
    "/%2fevil",
    "/login",
    "/onboarding",
    "/onboarding?next=/dashboard",
    "/onboarding/step",
    "/dashboard\n",
  ])("rejects unsafe return path %s", (value) => expect(safeReturnPath(value)).toBe("/dashboard"));
  it("allows known local paths", () =>
    expect(safeReturnPath("/settings/profile?tab=identity")).toBe(
      "/settings/profile?tab=identity"
    ));
  it.each([
    ["00012.5", "12.50"],
    ["0", "0.00"],
    ["90000000000000.00", "90000000000000.00"],
  ])("normalizes %s exactly", (input, output) =>
    expect(normalizeOpeningBalance(input)).toBe(output)
  );
  it.each(["1.001", "-1", "1e2", "90000000000000.01"])("rejects invalid money %s", (input) =>
    expect(() => normalizeOpeningBalance(input)).toThrow()
  );
  it("rejects impossible calendar dates", () =>
    expect(
      accountSchema.safeParse({
        accountName: "Test",
        accountType: "cash",
        openingBalance: "0",
        openingDate: "2026-02-30",
      }).success
    ).toBe(false));
});
