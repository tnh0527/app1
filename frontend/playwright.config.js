import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL || "http://localhost:5173";

export default defineConfig({
  testDir: "./tests",
  outputDir: "./playwright-artifacts/test-results",
  reporter: [
    [
      "html",
      { outputFolder: "playwright-artifacts/playwright-report", open: "never" },
    ],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    viewport: { width: 1440, height: 900 },
  },
  // Starts both Django + Vite unless you set E2E_NO_SERVER=1
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : {
        command: "npm run dev:fullstack",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 180_000,
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
