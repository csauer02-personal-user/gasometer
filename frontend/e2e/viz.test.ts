import { test, expect } from "@playwright/test";

test.describe("D3 Visualizations", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("Cost River chart renders with SVG elements", async ({ page }) => {
    const container = page.locator('[data-testid="cost-river"]');
    await expect(container).toBeVisible();
    await expect(container.locator("h3")).toHaveText("Cost River");
    const svg = container.locator("svg");
    await expect(svg).toBeVisible();
  });

  test("Burn Gauge renders with SVG arc", async ({ page }) => {
    const container = page.locator('[data-testid="burn-gauge"]');
    await expect(container).toBeVisible();
    await expect(container.locator("h3")).toHaveText("Burn Rate");
    const svg = container.locator("svg");
    await expect(svg).toBeVisible();
    // Gauge should render at least the background arc path
    const paths = container.locator("svg path");
    await expect(paths.first()).toBeVisible();
  });

  test("Heat Calendar renders with day cells", async ({ page }) => {
    const container = page.locator('[data-testid="heat-calendar"]');
    await expect(container).toBeVisible();
    await expect(container.locator("h3")).toHaveText("Spend Calendar");
    const svg = container.locator("svg");
    await expect(svg).toBeVisible();
    // Calendar should have day label text elements
    const dayLabels = container.locator("svg text.dayLabel");
    await expect(dayLabels).toHaveCount(7);
  });

  test("Flame Timeline chart section exists", async ({ page }) => {
    const container = page.locator('[data-testid="flame-timeline"]');
    await expect(container).toBeVisible();
    await expect(container.locator("h3")).toHaveText("Session Timeline");
    const svg = container.locator("svg");
    await expect(svg).toBeVisible();
  });

  test("Role Treemap chart section exists", async ({ page }) => {
    const container = page.locator('[data-testid="role-treemap"]');
    await expect(container).toBeVisible();
    await expect(container.locator("h3")).toHaveText("Role Treemap");
    const svg = container.locator("svg");
    await expect(svg).toBeVisible();
  });

  test("Heat Calendar tooltip appears on hover", async ({ page }) => {
    const container = page.locator('[data-testid="heat-calendar"]');
    await expect(container).toBeVisible();
    const dayCell = container.locator("svg rect.day").first();
    // Only test tooltip if day cells exist
    if ((await dayCell.count()) > 0) {
      await dayCell.hover();
      const tooltip = container.locator("div.absolute");
      await expect(tooltip).toBeVisible();
    }
  });

  test("Burn Gauge shows today label", async ({ page }) => {
    const container = page.locator('[data-testid="burn-gauge"]');
    const svg = container.locator("svg");
    await expect(svg).toBeVisible();
    // The gauge renders "today" text in the SVG
    const todayText = container.locator('svg text:text-is("today")');
    await expect(todayText).toBeVisible();
  });
});
