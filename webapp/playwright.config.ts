import { defineConfig, devices } from "@playwright/test";

// E2E smoke tests run against the built static site served by `vite preview`.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: "http://localhost:4173/ILUC_NIPE/",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run preview",
    url: "http://localhost:4173/ILUC_NIPE/",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
