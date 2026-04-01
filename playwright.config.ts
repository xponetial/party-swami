import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 3000);

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      ...process.env,
      DEBUG: "",
      PORT: String(port),
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
