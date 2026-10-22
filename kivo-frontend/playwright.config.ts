import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Real development verification shares a single-threaded Django runner, not a load-test server.
  workers: 1,
  reporter: "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    baseURL: "http://localhost:3001",
    // Authentication traces can retain credentials; keep them disabled for real tests.
    trace: "off",
    storageState: ".playwright-auth/session.json",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "Mobile Chrome",
      testIgnore: "**/part1-live.spec.ts",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    command: "node node_modules/next/dist/bin/next start -p 3001",
    url: "http://localhost:3001",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
