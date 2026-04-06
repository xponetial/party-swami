import Link from "next/link";
import { AlertTriangle, Bot, BrainCircuit, DollarSign, TimerReset } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { DashboardMetricCard } from "@/components/dashboard/dashboard-metric-card";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import {
  formatAdminCurrency,
  formatAdminDateTime,
  getAdminAiMetrics,
  normalizeAdminRange,
  requireAdminAccess,
} from "@/lib/admin";
import { Button } from "@/components/ui/button";

const rangeOptions = [
  { label: "7 days", value: "7" },
  { label: "30 days", value: "30" },
  { label: "90 days", value: "90" },
] as const;

export default async function AdminAiPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const resolved = await searchParams;
  const rangeDays = normalizeAdminRange(resolved.range);
  const [{ profile }, ai] = await Promise.all([
    requireAdminAccess(),
    getAdminAiMetrics(rangeDays),
  ]);
  const maxModelCost = Math.max(1, ...ai.byModel.map((item) => item.costUsd));
  const maxGenerationTypeCost = Math.max(1, ...ai.byGenerationType.map((item) => item.costUsd));

  return (
    <AdminShell
      currentSection="/admin/ai"
      title="AI control center"
      description="Monitor model usage, cost, latency, and fallback behavior across Party Genie's AI features."
      adminName={profile?.full_name}
      actions={
        <div className="flex flex-wrap gap-2">
          {rangeOptions.map((option) => (
            <Button
              key={option.value}
              asChild
              variant={rangeDays === Number(option.value) ? "primary" : "secondary"}
            >
              <Link href={option.value === "30" ? "/admin/ai" : `/admin/ai?range=${option.value}`}>
                {option.label}
              </Link>
            </Button>
          ))}
        </div>
      }
    >
      <div className="grid gap-4 xl:grid-cols-3">
        <DashboardMetricCard
          detail={`In the last ${rangeDays} days`}
          icon={BrainCircuit}
          label="AI requests"
          value={String(ai.totals.requests)}
        />
        <DashboardMetricCard
          detail="Summed from ai_generations"
          icon={DollarSign}
          label="Estimated cost"
          value={formatAdminCurrency(ai.totals.estimatedCostUsd)}
        />
        <DashboardMetricCard
          detail="Average over generations with latency"
          icon={TimerReset}
          label="Avg latency"
          value={`${ai.totals.averageLatencyMs} ms`}
        />
        <DashboardMetricCard
          detail="Non-success runs captured in the window"
          icon={AlertTriangle}
          label="Fallbacks"
          value={String(ai.totals.fallbackCount)}
        />
        <DashboardMetricCard
          detail="Successful generations as a percentage of all requests"
          icon={Bot}
          label="Success rate"
          value={`${ai.totals.successRate}%`}
        />
        <DashboardMetricCard
          detail="Cache reuse can materially lower cost over time"
          icon={BrainCircuit}
          label="Cached input tokens"
          value={String(ai.totals.cachedInputTokens)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DashboardPanel
          title="Cost by model"
          description="See which models are carrying the most cost and request volume."
        >
          <div className="space-y-3">
            {ai.byModel.map((item) => (
              <div key={item.model} className="rounded-2xl border border-border bg-white/65 px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-ink">{item.model}</p>
                    <p className="mt-1 text-sm text-ink-muted">{item.requests} requests</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-ink">{formatAdminCurrency(item.costUsd)}</p>
                    <p className="mt-1 text-sm text-ink-muted">{item.averageLatencyMs} ms avg</p>
                  </div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-canvas">
                  <div
                    className="h-2 rounded-full bg-[linear-gradient(135deg,#2f8fff_0%,#8b46ff_58%,#ff7bd5_100%)]"
                    style={{ width: `${Math.max(12, Math.round((item.costUsd / maxModelCost) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Cost by generation type"
          description="Which product surfaces are driving the most AI usage right now."
        >
          <div className="space-y-3">
            {ai.byGenerationType.map((item) => (
              <div key={item.generationType} className="rounded-2xl border border-border bg-white/65 px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-ink">{item.generationType.replaceAll("_", " ")}</p>
                    <p className="mt-1 text-sm text-ink-muted">{item.requests} requests</p>
                  </div>
                  <p className="font-semibold text-ink">{formatAdminCurrency(item.costUsd)}</p>
                </div>
                <div className="mt-3 h-2 rounded-full bg-canvas">
                  <div
                    className="h-2 rounded-full bg-[linear-gradient(135deg,#ff7bd5_0%,#a54dff_36%,#2f8fff_100%)]"
                    style={{
                      width: `${Math.max(12, Math.round((item.costUsd / maxGenerationTypeCost) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </DashboardPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <DashboardPanel
          title="Monthly usage rollup"
          description="Current month totals from the per-user monthly usage table."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Requests", value: String(ai.monthlyUsage.requestsCount) },
              { label: "Estimated cost", value: formatAdminCurrency(ai.monthlyUsage.estimatedCostUsd) },
              { label: "Input tokens", value: String(ai.monthlyUsage.inputTokens) },
              { label: "Output tokens", value: String(ai.monthlyUsage.outputTokens) },
              { label: "Cached input tokens", value: String(ai.monthlyUsage.cachedInputTokens) },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-canvas px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">{item.label}</p>
                <p className="mt-2 text-xl font-semibold text-ink">{item.value}</p>
              </div>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Recent failures and fallbacks"
          description="The first place to check when the AI feels expensive, slow, or low confidence."
        >
          <div className="space-y-3">
            {ai.recentFailures.length ? (
              ai.recentFailures.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border bg-white/65 px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-ink">{item.generationType.replaceAll("_", " ")}</p>
                      <p className="mt-1 text-sm text-ink-muted">
                        {item.model} | {item.status}
                        {item.userEmail ? ` | ${item.userEmail}` : ""}
                        {item.eventTitle ? ` | ${item.eventTitle}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-ink">{formatAdminCurrency(item.estimatedCostUsd)}</p>
                      <p className="mt-1 text-sm text-ink-muted">{formatAdminDateTime(item.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-border bg-canvas px-4 py-5 text-sm leading-6 text-ink-muted">
                No failures or fallbacks were recorded in this range.
              </div>
            )}
          </div>
        </DashboardPanel>
      </div>
    </AdminShell>
  );
}
