import { describe, it, expect } from "vitest";
import { isNavigationActive } from "@/components/layout/AppNav";

describe("application navigation", () => {
  it.each([
    ["/dashboard", "/dashboard", true],
    ["/money/owned-account", "/money", true],
    ["/money/sources", "/money", false],
    ["/money/sources/owned-source", "/money", false],
    ["/money/sources/owned-source", "/money/sources", true],
    ["/transactions/owned-event", "/transactions", true],
    ["/people-other", "/people", false],
    ["/settings/profile", "/settings/categories", false],
  ])("marks %s against %s correctly", (path, href, result) =>
    expect(isNavigationActive(path, href)).toBe(result)
  );
});
