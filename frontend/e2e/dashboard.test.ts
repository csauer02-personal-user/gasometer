import { test, expect } from "@playwright/test";

test("dashboard page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toHaveText("Cost Dashboard");
});

test("navigation links exist", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('a[href="/sessions"]')).toBeVisible();
  await expect(page.locator('a[href="/live"]')).toBeVisible();
});

test("sessions page loads", async ({ page }) => {
  await page.goto("/sessions");
  await expect(page.locator("h1")).toHaveText("Session Explorer");
});

test("live page loads", async ({ page }) => {
  await page.goto("/live");
  await expect(page.locator("h1")).toHaveText("Live Feed");
});
