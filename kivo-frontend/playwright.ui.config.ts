import { defineConfig, devices } from "@playwright/test";

/** Read-only production profiling with the existing private development fixture. */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/ui-*.spec.ts",
  workers: 1,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 25_000 },
  use: {
    baseURL: "http://localhost:3001",
    ...devices["Desktop Chrome"],
    storageState: ".playwright-auth/session.json",
    trace: "off",
    screenshot: "only-on-failure",
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
  },
  webServer: {
    command: "node node_modules/next/dist/bin/next start -p 3001",
    url: "http://localhost:3001",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
