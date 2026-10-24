import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { usePathname } from "next/navigation";

vi.mock("next/navigation", () => ({ usePathname: vi.fn(() => "/") }));

// Component tests are isolated mocked-HTTP tests, never Django integration tests.
beforeEach(() => {
  vi.mocked(usePathname).mockReturnValue("/");
  document.cookie = "csrftoken=component-test-csrf; path=/";
  sessionStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { error: { status_code: 401, type: "authentication_required" } },
          { status: 401 }
        )
      )
  );
});

// Runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
