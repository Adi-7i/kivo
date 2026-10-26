import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

/** Focused entry-flow verification: no unrelated financial fixture seeding. */
export default defineConfig({
  ...base,
  testMatch: ["**/phase1.spec.ts", "**/entry-*.spec.ts"],
  globalSetup: undefined,
  retries: 0,
  use: { ...base.use, storageState: { cookies: [], origins: [] } },
  projects: base.projects?.map((project) => ({
    ...project,
    testIgnore: project.name === "Mobile Chrome" ? ["**/entry-live.spec.ts"] : undefined,
  })),
});
