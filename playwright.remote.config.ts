import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const stageBaseUrl = process.env.E2E_STAGE_BASE_URL ?? "https://stage.partyswami.com";
const prodBaseUrl = process.env.E2E_PROD_BASE_URL ?? "https://partyswami.com";
const protectionBypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

const extraHTTPHeaders: Record<string, string> = {};
if (protectionBypassSecret) {
  extraHTTPHeaders["x-vercel-protection-bypass"] = protectionBypassSecret;
}

export default defineConfig({
  testDir: "./tests/remote",
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  expect: {
    timeout: 15_000,
  },
  reporter: [
    ["list"],
    ["./tests/remote/remote-summary-reporter.ts"],
  ],
  use: {
    channel: "chrome",
    launchOptions: {
      args: ["--disable-blink-features=AutomationControlled"],
      ignoreDefaultArgs: ["--enable-automation"],
    },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
    extraHTTPHeaders,
  },
  projects: [
    {
      name: "setup-stage",
      testMatch: /auth\.setup\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: stageBaseUrl,
      },
    },
    {
      name: "stage",
      testMatch: /user-journey\.spec\.ts/,
      dependencies: ["setup-stage"],
      use: {
        ...devices["Desktop Chrome"],
        baseURL: stageBaseUrl,
        storageState: "playwright/.auth/stage-user.json",
      },
    },
    {
      name: "setup-prod",
      testMatch: /auth\.setup\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: prodBaseUrl,
      },
    },
    {
      name: "prod",
      testMatch: /user-journey\.spec\.ts/,
      dependencies: ["setup-prod"],
      use: {
        ...devices["Desktop Chrome"],
        baseURL: prodBaseUrl,
        storageState: "playwright/.auth/prod-user.json",
      },
    },
  ],
});
