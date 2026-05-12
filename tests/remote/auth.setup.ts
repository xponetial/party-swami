import { test as setup } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

function resolveStorageStatePath(projectName: string): string {
  const lower = projectName.toLowerCase();
  if (lower.includes("stage")) {
    return "playwright/.auth/stage-user.json";
  }
  if (lower.includes("prod")) {
    return "playwright/.auth/prod-user.json";
  }
  throw new Error(`Unknown auth setup project: ${projectName}`);
}

setup("authenticate with Google account", async ({ page }, testInfo) => {
  const storageStatePath = resolveStorageStatePath(testInfo.project.name);
  const absolutePath = path.resolve(storageStatePath);

  if (fs.existsSync(absolutePath)) {
    return;
  }

  const baseURL = testInfo.project.use.baseURL;
  if (typeof baseURL !== "string" || baseURL.length === 0) {
    throw new Error("Project baseURL is missing for auth setup.");
  }

  const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const bootstrapPath = "/api/internal/e2e/provision-session";
  const bootstrapUrl = bypassSecret
    ? `${bootstrapPath}?x-vercel-protection-bypass=${encodeURIComponent(bypassSecret)}`
    : bootstrapPath;
  const email = process.env.E2E_TEST_EMAIL ?? "e2e-party-swami-auth@mailinator.com";
  const password = process.env.E2E_TEST_PASSWORD ?? "Tmp#123456789";

  const response = await page.request.post(bootstrapUrl, {
    data: {
      email,
      password,
    },
    headers: bypassSecret
      ? {
          "x-vercel-protection-bypass": bypassSecret,
        }
      : undefined,
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`E2E session bootstrap failed: ${response.status()} ${body}`);
  }

  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

  // If an existing session is already active, persist it immediately.
  if (/\/dashboard(\?.*)?$/i.test(page.url())) {
    await page.context().storageState({ path: storageStatePath });
    return;
  }

  await page.waitForURL(/\/dashboard(\?.*)?$/i, { timeout: 180_000 });

  await page.context().storageState({ path: storageStatePath });
});
