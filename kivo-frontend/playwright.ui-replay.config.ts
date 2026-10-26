import { defineConfig } from "@playwright/test";
import base from "./playwright.ui.config";

/** Geometry/accessibility only; all mocked upstream responses are captured real owned GETs. */
export default defineConfig({
  ...base,
  testMatch: "**/ui-responsive.spec.ts",
  projects: [{ name: "captured-read-replay" }],
  webServer: [
    {
      command: "node e2e/ui-snapshot-server.mjs",
      url: "http://127.0.0.1:8002",
      env: { KIVO_UI_REPLAY: "1" },
      reuseExistingServer: false,
    },
    {
      command: "node node_modules/next/dist/bin/next start -p 3001",
      url: "http://localhost:3001",
      env: { DJANGO_API_ORIGIN: "http://127.0.0.1:8002" },
      reuseExistingServer: false,
    },
  ],
});
