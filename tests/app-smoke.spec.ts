import { expect, test } from "@playwright/test";

test("marketing home renders", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /turn a party idea into a full plan/i,
    }),
  ).toBeVisible();
});

test("login and signup pages render", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();

  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: /welcome to partygenie/i })).toBeVisible();
});

test("pricing page reflects live tier limits", async ({ page }) => {
  await page.goto("/pricing");

  await expect(page.getByRole("heading", { name: /real plan tiers for the partygenie beta/i })).toBeVisible();
  const freeCard = page.getByTestId("pricing-card-free");
  const proCard = page.getByTestId("pricing-card-pro");

  await expect(freeCard.getByText(/monthly ai requests/i).first()).toBeVisible();
  await expect(freeCard.getByText("50", { exact: true })).toBeVisible();
  await expect(proCard.getByText("500", { exact: true })).toBeVisible();
});

test("dashboard redirects unauthenticated users to login", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
});

test("missing RSVP invite returns not found", async ({ page }) => {
  const response = await page.goto("/rsvp/not-a-real-public-slug");

  expect(response?.status()).toBe(404);
});
