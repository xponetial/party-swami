import { expect, test } from "@playwright/test";

const BYPASS_SECRET = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "";

test("phase 14 workflow links and continue flow", async ({ page }) => {
  test.setTimeout(120_000);
  expect(BYPASS_SECRET.length).toBeGreaterThan(0);

  await page.goto("/");

  const bootstrapStatus = await page.evaluate(async (secret) => {
    const response = await fetch(
      `/api/internal/e2e/provision-session?x-vercel-protection-bypass=${encodeURIComponent(secret)}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-vercel-protection-bypass": secret,
        },
        body: JSON.stringify({
          email: "e2e-party-swami-auth@mailinator.com",
          password: "Tmp#123456789",
        }),
      },
    );
    return response.status;
  }, BYPASS_SECRET);

  expect(bootstrapStatus).toBe(200);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard(\?.*)?$/i);

  await page.goto("/events/new", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Event title").fill(`Phase14 Smoke ${Date.now()}`);
  await page.getByRole("button", { name: /continue to enhanced questions/i }).click();

  const intakeOrInvite = /\/events\/[^/]+\/(intake|invite)(\?.*)?$/i;
  await expect(page).toHaveURL(intakeOrInvite);

  if (/\/invite(\?.*)?$/i.test(page.url())) {
    const eventRoot = page.url().replace(/\/invite(\?.*)?$/i, "");
    await page.goto(`${eventRoot}/intake`);
  }

  await expect(page).toHaveURL(/\/events\/[^/]+\/intake(\?.*)?$/i);

  const nav = {
    overview: page.locator('[data-tour-id="event-nav-overview"]'),
    intake: page.locator('[data-tour-id="event-nav-intake"]'),
    edit: page.locator('[data-tour-id="event-nav-edit"]'),
    invite: page.locator('[data-tour-id="event-nav-invite"]'),
    guests: page.locator('[data-tour-id="event-nav-guests"]'),
    nextSteps: page.locator('[data-tour-id="event-nav-next-steps"]'),
    shopping: page.locator('[data-tour-id="event-nav-shopping"]'),
    timeline: page.locator('[data-tour-id="event-nav-timeline"]'),
  };

  await expect(nav.overview).toBeVisible();
  await expect(nav.intake).toBeVisible();
  await expect(nav.edit).toBeVisible();

  const overviewHref = await nav.overview.getAttribute("href");
  expect(overviewHref).toBeTruthy();
  await page.goto(overviewHref!);
  await expect(page).toHaveURL(/\/events\/[^/]+$/i);

  await page.getByRole("link", { name: /^continue$/i }).click();
  await expect(page).toHaveURL(/\/events\/[^/]+\/intake(\?.*)?$/i);

  await nav.edit.click();
  await expect(page).toHaveURL(/\/events\/[^/]+\/edit(\?.*)?$/i);

  await nav.invite.click();
  await expect(page).toHaveURL(/\/events\/[^/]+\/invite(\?.*)?$/i);

  const guestsHref = await nav.guests.getAttribute("href");
  expect(guestsHref).toBeTruthy();
  await page.goto(guestsHref!);
  await expect(page).toHaveURL(/\/events\/[^/]+\/guests\/add(\?.*)?$/i);

  const nextStepsHref = await nav.nextSteps.getAttribute("href");
  expect(nextStepsHref).toBeTruthy();
  await page.goto(nextStepsHref!);
  await expect(page).toHaveURL(/\/events\/[^/]+\/next-steps(\?.*)?$/i);

  const shoppingHref = await nav.shopping.getAttribute("href");
  expect(shoppingHref).toBeTruthy();
  await page.goto(shoppingHref!);
  await expect(page).toHaveURL(/\/events\/[^/]+\/shopping(\?.*)?$/i);

  const timelineHref = await nav.timeline.getAttribute("href");
  expect(timelineHref).toBeTruthy();
  await page.goto(timelineHref!);
  await expect(page).toHaveURL(/\/events\/[^/]+\/timeline(\?.*)?$/i);
});
