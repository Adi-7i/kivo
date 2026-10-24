import { QueryClient } from "@tanstack/react-query";
import { vi } from "vitest";
export const accountId = "00000000-0000-4000-8000-000000000001";
export const categoryId = "00000000-0000-4000-8000-000000000002";
export const user = {
  id: 501,
  name: "Mock financial user",
  email: "mock@example.test",
  date_joined: "2026-10-22T00:00:00Z",
};
export function client() {
  const value = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  value.setQueryData(["session"], user);
  return value;
}
export const account = {
  id: accountId,
  name: "Mock Cash",
  kind: "cash",
  opened_on: "2026-01-01",
  archived: false,
  created_at: "2026-01-01T00:00:00Z",
  balance: "10.00",
  opening_balance: "10.00",
};
export function mockLists() {
  vi.mocked(fetch).mockImplementation(async (input) => {
    const path = String(input);
    if (path.includes("/accounts/"))
      return Response.json({ count: 1, next: null, previous: null, results: [account] });
    if (path.includes("/categories/"))
      return Response.json({
        count: 1,
        next: null,
        previous: null,
        results: [{ id: categoryId, name: "Mock Food", parent: null, archived: false }],
      });
    return Response.json(user);
  });
}
