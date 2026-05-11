import { test as base } from "@playwright/test";

type MetricSample = {
  kind: "document" | "api" | "asset";
  method: string;
  url: string;
  status: number;
  ok: boolean;
  durationMs: number;
};

type FailureSample = {
  kind: "request_failed" | "page_error" | "console_error";
  message: string;
  url?: string;
};

type Telemetry = {
  baseUrl: string;
  pageUrl: string;
  metrics: MetricSample[];
  failures: FailureSample[];
};

function categorizeResource(url: string): MetricSample["kind"] {
  if (url.includes("/api/")) {
    return "api";
  }
  if (/\.(js|css|png|jpg|jpeg|svg|webp|woff2?)($|\?)/i.test(url)) {
    return "asset";
  }
  return "document";
}

export const test = base.extend<{ telemetry: Telemetry }>({
  telemetry: [
    async ({ page, baseURL }, use, testInfo) => {
      const startedAt = new Map<string, number>();
      const metrics: MetricSample[] = [];
      const failures: FailureSample[] = [];
      const payload: Telemetry = {
        baseUrl: baseURL ?? "",
        pageUrl: "",
        metrics,
        failures,
      };

      page.on("request", (request) => {
        startedAt.set(request.url(), Date.now());
      });

      page.on("response", (response) => {
        const request = response.request();
        const start = startedAt.get(request.url()) ?? Date.now();
        metrics.push({
          kind: categorizeResource(request.url()),
          method: request.method(),
          url: request.url(),
          status: response.status(),
          ok: response.ok(),
          durationMs: Math.max(1, Date.now() - start),
        });
      });

      page.on("requestfailed", (request) => {
        failures.push({
          kind: "request_failed",
          message: request.failure()?.errorText ?? "Unknown request failure",
          url: request.url(),
        });
      });

      page.on("pageerror", (error) => {
        failures.push({
          kind: "page_error",
          message: error.message,
        });
      });

      page.on("console", (message) => {
        if (message.type() === "error") {
          failures.push({
            kind: "console_error",
            message: message.text(),
          });
        }
      });

      await use(payload);
      payload.pageUrl = page.url();

      await testInfo.attach("telemetry.json", {
        contentType: "application/json",
        body: Buffer.from(JSON.stringify(payload, null, 2)),
      });
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
export type { Telemetry, MetricSample, FailureSample };
