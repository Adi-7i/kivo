import { test, expect } from "@playwright/test";

test.describe("Frontend Phase 2 — Authentication, Onboarding & Profile E2E", () => {
  test.describe("Login Page (/login)", () => {
    test("loads login page and renders accessible elements", async ({ page }) => {
      const response = await page.goto("/login");
      expect(response?.status()).toBe(200);

      await expect(page).toHaveTitle(/Sign In — Kivo/i);
      await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();
      await expect(page.getByLabel(/Email address/i)).toBeVisible();
      await expect(page.getByLabel(/^Password/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /Sign In/i })).toBeVisible();
      await expect(page.getByRole("link", { name: /Create an account/i })).toBeVisible();
    });

    test("validates empty submission and toggles password visibility", async ({ page }) => {
      await page.goto("/login");

      // Submit empty
      await page.getByRole("button", { name: /Sign In/i }).click();
      await expect(page.getByText("Email address is required")).toBeVisible();
      await expect(page.getByText("Password is required")).toBeVisible();

      // Toggle password
      const pwInput = page.getByLabel(/^Password/i);
      await expect(pwInput).toHaveAttribute("type", "password");
      await page.getByRole("button", { name: /Show password/i }).click();
      await expect(pwInput).toHaveAttribute("type", "text");
    });

    test("submitting valid inputs shows integration pending without fake auth", async ({
      page,
    }) => {
      await page.goto("/login");

      await page.getByLabel(/Email address/i).fill("test@kivo.finance");
      await page.getByLabel(/^Password/i).fill("MyPassword123");
      await page.getByRole("button", { name: /Sign In/i }).click();

      await expect(
        page.getByText(
          /Backend integration pending: Authentication API will be connected in Phase 3/i
        )
      ).toBeVisible();
    });
  });

  test.describe("Register Page (/register)", () => {
    test("loads register page and displays dynamic password guidelines", async ({ page }) => {
      await page.goto("/register");

      await expect(page).toHaveTitle(/Create Account — Kivo/i);
      await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
      await expect(page.getByText(/At least 8 characters/i)).toBeVisible();
      await expect(page.getByText(/Contains at least one letter/i)).toBeVisible();
      await expect(page.getByText(/Contains at least one number/i)).toBeVisible();
    });

    test("validates password mismatch", async ({ page }) => {
      await page.goto("/register");

      await page.getByLabel(/Full name/i).fill("Adarsh Sharma");
      await page.getByLabel(/Email address/i).fill("adarsh@kivo.finance");
      await page.getByLabel(/^Password/i).fill("SecretPass123");
      await page.getByLabel(/Confirm password/i).fill("MismatchPass123");

      await page.getByRole("button", { name: /Create Account/i }).click();
      await expect(page.getByText("Passwords do not match")).toBeVisible();
    });

    test("submitting valid registration displays backend pending banner", async ({ page }) => {
      await page.goto("/register");

      await page.getByLabel(/Full name/i).fill("Adarsh Sharma");
      await page.getByLabel(/Email address/i).fill("adarsh@kivo.finance");
      await page.getByLabel(/^Password/i).fill("SecurePass123");
      await page.getByLabel(/Confirm password/i).fill("SecurePass123");

      await page.getByRole("button", { name: /Create Account/i }).click();
      await expect(
        page.getByText(
          /Backend integration pending: Account registration API will be connected in Phase 3/i
        )
      ).toBeVisible();
    });
  });

  test.describe("Onboarding Flow (/onboarding)", () => {
    test("walks through all 4 onboarding steps preserving entered data", async ({ page }) => {
      await page.goto("/onboarding");

      // Step 1: Welcome
      await expect(page.getByRole("heading", { name: "Welcome to Kivo" })).toBeVisible();
      await page.getByRole("button", { name: /Begin Setup/i }).click();

      // Step 2: Personal Setup
      await expect(page.getByRole("heading", { name: "Personal Setup" })).toBeVisible();
      await page.getByLabel(/Display Name/i).fill("Adarsh Sharma");
      await page.getByRole("button", { name: /Continue to Account/i }).click();

      // Step 3: First Account
      await expect(page.getByRole("heading", { name: "Your First Money Account" })).toBeVisible();
      await expect(page.getByText("Opening Balance is Not Income")).toBeVisible();

      await page.getByLabel(/Account Name/i).fill("Salary Account");
      await page.getByLabel(/Opening Balance/i).fill("45000");
      await page.getByRole("button", { name: /Review Setup/i }).click();

      // Step 4: Summary
      await expect(page.getByRole("heading", { name: "Setup Summary" })).toBeVisible();
      await expect(page.getByText("Adarsh Sharma")).toBeVisible();
      await expect(page.getByText("Salary Account")).toBeVisible();
      await expect(page.getByText("₹45,000.00")).toBeVisible();

      // Complete setup
      await page.getByRole("button", { name: /Complete Setup/i }).click();
      await expect(
        page.getByText(
          /Backend integration pending: Submitting setup will post opening account entries/i
        )
      ).toBeVisible();
    });
  });

  test.describe("Profile Page (/settings/profile)", () => {
    test("loads profile page in preview mode without authentication", async ({ page }) => {
      await page.goto("/settings/profile");

      await expect(page).toHaveTitle(/User Profile & Settings — Kivo/i);
      await expect(page.getByText("User Profile UI Preview")).toBeVisible();
      await expect(page.getByText("Preview Mode", { exact: true })).toBeVisible();
      await expect(page.getByText(/INR \(₹\) • Paise Integer/i)).toBeVisible();
      await expect(page.getByText(/Asia\/Kolkata \(IST\)/i)).toBeVisible();
    });

    test("attempting to update profile shows integration pending badge", async ({ page }) => {
      await page.goto("/settings/profile");

      await page.getByRole("button", { name: /Update Profile Details/i }).click();
      await expect(
        page.getByText(
          /Backend integration pending: Profile mutations and preference updates will connect/i
        )
      ).toBeVisible();
    });
  });

  test.describe("Responsive Overflow & Viewports", () => {
    const viewports = [
      { name: "mobile (375px)", width: 375, height: 667 },
      { name: "tablet (768px)", width: 768, height: 1024 },
      { name: "desktop (1440px)", width: 1440, height: 900 },
    ];

    const routes = ["/login", "/register", "/onboarding", "/settings/profile"];

    for (const vp of viewports) {
      for (const route of routes) {
        test(`renders ${route} cleanly on ${vp.name} without horizontal overflow`, async ({
          page,
        }) => {
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.goto(route);

          const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
          const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
          expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
        });
      }
    }
  });
});
