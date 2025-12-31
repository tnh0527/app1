import { test, expect } from "@playwright/test";
import path from "node:path";
import { mkdir } from "node:fs/promises";

const routes = [
  { name: "dashboard", path: "/dashboard" },
  { name: "calendar", path: "/calendar" },
  { name: "weather", path: "/weather" },
  { name: "settings", path: "/settings" },
  { name: "profile", path: "/profile" },
];

async function ensureAuthed(page) {
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;

  if (!username || !password) {
    // Fallback: allow navigating protected routes (frontend-only)
    await page.addInitScript(() => {
      localStorage.setItem("isAuthenticated", "true");
    });
    return;
  }

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /log in/i }).click();

  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
  await expect(page).not.toHaveURL("/");
}

test("capture app routes (screenshots)", async ({ page }) => {
  const screenshotsDir = path.join("playwright-artifacts", "screenshots");
  await mkdir(screenshotsDir, { recursive: true });

  await ensureAuthed(page);

  for (const route of routes) {
    await page.goto(route.path, { waitUntil: "domcontentloaded" });
    // Small settle window for async layout/data.
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(screenshotsDir, `${route.name}.png`),
      fullPage: true,
    });
  }
});
