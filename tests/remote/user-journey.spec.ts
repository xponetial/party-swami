import { expect, test } from "./fixtures";

const SLOW_THRESHOLD_MS = Number(process.env.E2E_SLOW_THRESHOLD_MS ?? 4000);

test.describe("authenticated user journey", () => {
  test("dashboard and key surfaces load without critical failures", async ({ page }, testInfo) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard(\?.*)?$/i);

    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();

    await page.goto("/events/new", { waitUntil: "domcontentloaded", timeout: 90_000 });
    await expect(page).toHaveURL(/\/(events\/new|create-event)(\?.*)?$/i);

    await page.goto("/marketplace", { waitUntil: "domcontentloaded", timeout: 90_000 });
    const marketplaceUrl = page.url();
    if (!/\/marketplace(\?.*)?$/i.test(marketplaceUrl)) {
      testInfo.annotations.push({
        type: "condition",
        description: `Marketplace path redirected to ${marketplaceUrl}`,
      });
      await expect(page).toHaveURL(/\/dashboard(\?.*)?$/i);
    }

    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: /plan tiers|pricing/i })).toBeVisible();
  });

  test("core APIs return healthy status", async ({ page }) => {
    const checks = [
      "/api/usage/me",
      "/api/events/00000000-0000-0000-0000-000000000000/plan",
    ] as const;

    for (const path of checks) {
      const response = await page.request.get(path);
      expect(response.status(), `${path} should return a non-5xx status`).toBeLessThan(500);
    }
  });

  test("marks slow requests in test annotations", async ({ page }, testInfo) => {
    await page.goto("/dashboard");

    const resourceEntries = await page.evaluate(() => {
      return performance
        .getEntriesByType("resource")
        .map((entry) => ({
          name: entry.name,
          duration: Math.round(entry.duration),
        }))
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10);
    });

    const slowEntries = resourceEntries.filter((entry) => entry.duration >= SLOW_THRESHOLD_MS);

    if (slowEntries.length > 0) {
      testInfo.annotations.push({
        type: "slow_resources",
        description: JSON.stringify(slowEntries),
      });
    }

    expect(resourceEntries.length).toBeGreaterThan(0);
  });
});
