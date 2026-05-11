import fs from "node:fs";
import path from "node:path";
import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from "@playwright/test/reporter";

type TelemetryAttachment = {
  baseUrl: string;
  pageUrl: string;
  metrics: Array<{
    kind: "document" | "api" | "asset";
    method: string;
    url: string;
    status: number;
    ok: boolean;
    durationMs: number;
  }>;
  failures: Array<{
    kind: "request_failed" | "page_error" | "console_error";
    message: string;
    url?: string;
  }>;
};

class RemoteSummaryReporter implements Reporter {
  private outputDir = "test-results";
  private readonly rows: string[] = [];

  onBegin(config: FullConfig, _suite: Suite): void {
    this.outputDir = config.projects[0]?.outputDir ?? "test-results";
    this.rows.length = 0;
    this.rows.push("# Remote E2E Summary");
    this.rows.push("");
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const project = test.parent.project()?.name ?? "unknown";
    const status = result.status;
    const durationMs = result.duration;

    const telemetry = this.readTelemetry(result);
    const totalRequests = telemetry?.metrics.length ?? 0;
    const slowCount = (telemetry?.metrics ?? []).filter((m) => m.durationMs >= Number(process.env.E2E_SLOW_THRESHOLD_MS ?? 4000)).length;
    const errorCount = telemetry?.failures.length ?? 0;

    this.rows.push(`## ${project} - ${test.title}`);
    this.rows.push(`- Status: ${status}`);
    this.rows.push(`- Duration: ${durationMs} ms`);
    this.rows.push(`- Requests observed: ${totalRequests}`);
    this.rows.push(`- Slow requests: ${slowCount}`);
    this.rows.push(`- Captured runtime errors: ${errorCount}`);

    if (result.error) {
      this.rows.push(`- Failure: ${result.error.message}`);
    }

    if (slowCount > 0 && telemetry) {
      const slowest = telemetry.metrics
        .slice()
        .sort((a, b) => b.durationMs - a.durationMs)
        .slice(0, 3)
        .map((m) => `${m.durationMs}ms ${m.method} ${m.url}`);
      this.rows.push(`- Slowest:`);
      for (const item of slowest) {
        this.rows.push(`  - ${item}`);
      }
    }

    if (errorCount > 0 && telemetry) {
      this.rows.push("- Runtime Errors:");
      for (const failure of telemetry.failures.slice(0, 5)) {
        this.rows.push(`  - ${failure.kind}: ${failure.message}${failure.url ? ` (${failure.url})` : ""}`);
      }
    }

    this.rows.push("");
  }

  onEnd(_result: FullResult): void {
    fs.mkdirSync(this.outputDir, { recursive: true });
    const filePath = path.join(this.outputDir, "remote-e2e-summary.md");
    fs.writeFileSync(filePath, this.rows.join("\n"), "utf8");
  }

  private readTelemetry(result: TestResult): TelemetryAttachment | null {
    const attachment = result.attachments.find((a) => a.name === "telemetry.json");
    if (!attachment?.body) {
      return null;
    }

    try {
      return JSON.parse(attachment.body.toString("utf8")) as TelemetryAttachment;
    } catch {
      return null;
    }
  }
}

export default RemoteSummaryReporter;
