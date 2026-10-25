import { request, expect } from "@playwright/test";
import { frontendOrigin, backendOrigin } from "./live-api";

/** Explicit recovery mode: reuse an existing private test session; never create or edit records.
 * Used only for read-only phase6 screen/export checks after a financial safety stop.
 */
export default async function readOnlySetup() {
  const context = await request.newContext({
    storageState: ".playwright-auth/session.json",
    timeout: 15_000,
  });
  try {
    expect((await context.get(backendOrigin + "/api/v1/health/db/")).status()).toBe(200);
    expect((await context.get(frontendOrigin + "/api/v1/auth/me/")).status()).toBe(200);
    const list = async (path: string) => {
      const response = await context.get(frontendOrigin + "/api/v1/" + path + "/");
      expect(response.status()).toBe(200);
      return (await response.json()).results;
    };
    const accounts = await list("accounts"),
      categories = await list("categories"),
      budgets = await list("budgets");
    const account = accounts.find((row: { name: string }) =>
      row.name.startsWith("Integration baseline ")
    );
    const category = categories.find((row: { name: string }) =>
      row.name.startsWith("Integration shared ")
    );
    const overall = budgets.find((row: { category: string | null }) => row.category === null);
    const categoryBudget = budgets.find(
      (row: { category: string | null }) => row.category === category?.id
    );
    if (!account || !category || !overall || !categoryBudget)
      throw new Error(
        "Existing owned development screen fixtures are unavailable. Read-only mode never falls back to creating records."
      );
    process.env.KIVO_E2E_ACCOUNT_A = account.id;
    process.env.KIVO_E2E_CATEGORY_A = category.id;
    process.env.KIVO_E2E_BUDGET_A = overall.id;
    process.env.KIVO_E2E_CATEGORY_BUDGET_A = categoryBudget.id;
  } finally {
    await context.dispose();
  }
}
