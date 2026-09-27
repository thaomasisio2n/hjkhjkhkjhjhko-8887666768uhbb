import { defineConfig, devices } from "@playwright/test";

// e2e runs its own API (port 8788, fresh seeded DB) and web dev server
// (port 5174), so it works next to a running `npm start`.
const API = "http://localhost:8788";
const WEB = "http://localhost:5174";

export default defineConfig({
  testDir: "e2e",
  timeout: 45_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: WEB,
    locale: "en-US",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
  webServer: [
    {
      command: "node scripts/e2e-api.mjs",
      url: `${API}/health`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: "npm run dev --workspace=apps/web -- --port 5174 --strictPort",
      url: WEB,
      env: { API_PROXY_TARGET: API },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
