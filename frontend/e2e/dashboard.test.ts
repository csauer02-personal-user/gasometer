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

test("KPI cards are rendered", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Today")).toBeVisible();
  await expect(page.getByText("This Week")).toBeVisible();
  await expect(page.getByText("This Month")).toBeVisible();
  await expect(page.getByText("Sessions")).toBeVisible();
});

test("date range picker is visible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "30 Days" })).toBeVisible();
  await expect(page.getByRole("button", { name: "7 Days" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Today" })).toBeVisible();
});

test("filter chips are visible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Role", { exact: true })).toBeVisible();
  await expect(page.getByText("Rig", { exact: true })).toBeVisible();
});

test("sessions page loads", async ({ page }) => {
  await page.goto("/sessions");
  await expect(page.locator("h1")).toHaveText("Session Explorer");
});

test("live page loads", async ({ page }) => {
  await page.goto("/live");
  await expect(page.locator("h1")).toHaveText("Live Feed");
});
