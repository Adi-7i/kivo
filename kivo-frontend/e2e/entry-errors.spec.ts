import { test, expect } from "@playwright/test";

// Deliberately mocked session failures. These cases do not prove Django availability.
for (const path of ["/", "/login", "/register"]) {
  test(`mocked session 503 at ${path} retains the route and recovers on explicit retry`, async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: "sessionid",
        value: "unverified-entry-test",
        domain: "localhost",
        path: "/",
        httpOnly: true,
      },
    ]);
    let unavailable = true;
    await page.route(/\/api\/v1\/auth\/me\/?$/, (route) =>
      route.fulfill({
        status: unavailable ? 503 : 401,
        contentType: "application/json",
        body: JSON.stringify({ error: { status_code: unavailable ? 503 : 401 } }),
      })
    );
    await page.goto(path);
    await expect(page.getByRole("button", { name: "Retry session check" })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${path === "/" ? "/" : path}$`));
    await expect(page.getByRole("button", { name: "Create Account", exact: true })).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Application navigation" })).toHaveCount(0);
    unavailable = false;
    await page.getByRole("button", { name: "Retry session check" }).click();
    await expect(page).toHaveURL(path === "/login" ? /\/login$/ : /\/register$/);
    await expect(
      page.getByRole("button", {
        name: path === "/login" ? "Sign In" : "Create Account",
        exact: true,
      })
    ).toBeVisible();
  });
}

test("anonymous direct access denies all integrated private route roots", async ({ page }) => {
  await page.route(/\/api\/v1\/auth\/me\/?$/, (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: "{}" })
  );
  for (const path of [
    "/dashboard",
    "/money",
    "/transactions",
    "/money/sources",
    "/people",
    "/shared-expenses",
    "/rent",
    "/budgets",
    "/reports",
    "/settings/profile",
    "/settings/categories",
    "/onboarding",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(
      (url) => url.pathname === "/login" && url.searchParams.get("next") === path
    );
    await expect(page.getByRole("button", { name: "Sign In", exact: true })).toBeVisible();
    await expect(page.getByTestId("dashboard-metrics")).toHaveCount(0);
  }
});
