import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import {
  getAdminAnalyticsMetrics,
  normalizeAdminRange,
  requireAdminAccess,
} from "@/lib/admin";
import { Button } from "@/components/ui/button";

const rangeOptions = [
  { label: "7 days", value: "7" },
  { label: "30 days", value: "30" },
  { label: "90 days", value: "90" },
] as const;

const stageOrder = [
  "account_created",
  "event_created",
  "invite_sent",
  "rsvp_received",
  "shopping_link_clicked",
] as const;

const stageLabels: Record<(typeof stageOrder)[number], string> = {
  account_created: "Account created",
  event_created: "Event created",
  invite_sent: "Invite sent",
  rsvp_received: "RSVP received",
  shopping_link_clicked: "Shopping click",
};

const stageColors: Record<(typeof stageOrder)[number], string> = {
  account_created: "bg-[#2f8fff]",
  event_created: "bg-[#7b6dff]",
  invite_sent: "bg-[#a54dff]",
  rsvp_received: "bg-[#ff7bd5]",
  shopping_link_clicked: "bg-[#ffb86b]",
};

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const resolved = await searchParams;
  const rangeDays = normalizeAdminRange(resolved.range);
  const [{ profile }, analytics] = await Promise.all([
    requireAdminAccess(),
    getAdminAnalyticsMetrics(rangeDays),
  ]);

  const maxStageValue = Math.max(1, ...analytics.funnel.map((step) => step.value));
  const maxDailyValue = Math.max(
    1,
    ...analytics.trendBuckets.flatMap((bucket) => Object.values(bucket.counts)),
  );

  return (
    <AdminShell
      currentSection="/admin/analytics"
      title="Analytics dashboard"
      description="A truer operations view of the host funnel, daily event pulse, and the surfaces that are moving adoption."
      adminName={profile?.full_name}
      actions={
        <div className="flex flex-wrap gap-2">
          {rangeOptions.map((option) => (
            <Button
              key={option.value}
              asChild
              variant={rangeDays === Number(option.value) ? "primary" : "secondary"}
            >
              <Link href={option.value === "30" ? "/admin/analytics" : `/admin/analytics?range=${option.value}`}>
                {option.label}
              </Link>
            </Button>
          ))}
        </div>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <DashboardPanel
          title="Funnel performance"
          description={`This is the operating view of how hosts are progressing over the last ${rangeDays} days.`}
        >
          <div className="grid gap-3 xl:grid-cols-5">
            {analytics.funnel.map((step, index) => (
              <div key={step.label} className="rounded-3xl bg-canvas p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">{step.label}</p>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink">
                    {Math.max(10, Math.round((step.value / maxStageValue) * 100))}%
                  </span>
                </div>
                <p className="mt-4 text-4xl font-semibold tracking-tight text-ink">{step.value}</p>
                <div className="mt-4 h-2 rounded-full bg-white">
                  <div
                    className="h-2 rounded-full bg-[linear-gradient(135deg,#ff7bd5_0%,#a54dff_36%,#2f8fff_100%)]"
                    style={{ width: `${Math.max(10, Math.round((step.value / maxStageValue) * 100))}%` }}
                  />
                </div>
                <p className="mt-3 text-sm leading-6 text-ink-muted">
                  {step.conversionFromPrevious == null
                    ? "Top-of-funnel baseline"
                    : `${step.conversionFromPrevious}% of the previous stage kept moving.`}
                </p>
                {index < analytics.funnel.length - 1 ? (
                  <div className="mt-4 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-ink-muted">
                    <ArrowRight className="size-3.5" />
                    Next stage
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="How to read this"
          description="Use this panel as the fast interpretation layer before diving into the tables."
        >
          <div className="space-y-3">
            {[
              {
                label: "Healthy signal",
                detail: "Invite sent and RSVP received should keep climbing together.",
              },
              {
                label: "Possible friction",
                detail: "If events are created but invites lag, hosts may be stalling in the invite workflow.",
              },
              {
                label: "Monetizable intent",
                detail: "Shopping clicks show whether hosts are engaging with retailer handoff recommendations.",
              },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-border bg-white/70 px-4 py-4">
                <p className="font-semibold text-ink">{item.label}</p>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{item.detail}</p>
              </div>
            ))}
          </div>
        </DashboardPanel>
      </div>

      <DashboardPanel
        title="Daily funnel pulse"
        description="A lightweight chart view of the core tracked events so this page reads more like an operations dashboard."
      >
        <div className="space-y-6">
          {stageOrder.map((stage) => (
            <div key={stage} className="grid gap-3 xl:grid-cols-[190px_1fr] xl:items-center">
              <div>
                <p className="text-sm font-semibold text-ink">{stageLabels[stage]}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-ink-muted">
                  {analytics.funnel.find((item) => item.label === stageLabels[stage])?.value ?? 0} total
                </p>
              </div>
              <div className="grid grid-cols-7 gap-2 md:grid-cols-10 xl:grid-cols-12">
                {analytics.trendBuckets.map((bucket) => {
                  const count = bucket.counts[stage] ?? 0;
                  const height = Math.max(12, Math.round((count / maxDailyValue) * 84));

                  return (
                    <div key={`${stage}-${bucket.bucket}`} className="flex flex-col items-center gap-2">
                      <div className="flex h-24 w-full items-end justify-center rounded-2xl bg-canvas px-2 py-2">
                        <div
                          className={`w-full rounded-xl ${stageColors[stage]}`}
                          style={{ height: `${height}px`, opacity: count === 0 ? 0.22 : 1 }}
                          title={`${bucket.bucket}: ${count}`}
                        />
                      </div>
                      <span className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">
                        {bucket.bucket}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </DashboardPanel>

      <div className="grid gap-4 xl:grid-cols-2">
        <DashboardPanel
          title="Top event types"
          description="The occasions contributing the most admin-visible activity in this window."
        >
          <div className="space-y-3">
            {analytics.topEventTypes.length ? (
              analytics.topEventTypes.map((item) => (
                <div key={item.label} className="rounded-2xl border border-border bg-white/70 px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold text-ink">{item.label}</p>
                    <span className="rounded-full bg-canvas px-3 py-1 text-sm font-semibold text-ink">
                      {item.count}
                    </span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-canvas">
                    <div
                      className="h-2 rounded-full bg-[linear-gradient(135deg,#ff7bd5_0%,#a54dff_36%,#2f8fff_100%)]"
                      style={{
                        width: `${Math.max(
                          12,
                          Math.round((item.count / Math.max(1, analytics.topEventTypes[0]?.count ?? 1)) * 100),
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-ink-muted">No event types were created in this range yet.</p>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Top template usage"
          description="The invite designs hosts are selecting most often in the same range."
        >
          <div className="space-y-3">
            {analytics.topTemplates.length ? (
              analytics.topTemplates.map((item) => (
                <div key={item.label} className="rounded-2xl border border-border bg-white/70 px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold text-ink">{item.label}</p>
                    <span className="rounded-full bg-canvas px-3 py-1 text-sm font-semibold text-ink">
                      {item.count}
                    </span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-canvas">
                    <div
                      className="h-2 rounded-full bg-[linear-gradient(135deg,#2f8fff_0%,#8b46ff_58%,#ff7bd5_100%)]"
                      style={{
                        width: `${Math.max(
                          12,
                          Math.round((item.count / Math.max(1, analytics.topTemplates[0]?.count ?? 1)) * 100),
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-ink-muted">No invite template usage is recorded yet.</p>
            )}
          </div>
        </DashboardPanel>
      </div>

      <DashboardPanel
        title="Recent raw analytics"
        description="The newest underlying analytics events, kept visible so the charting always has an inspectable source of truth."
      >
        <div className="space-y-3">
          {analytics.recentAnalytics.length ? (
            analytics.recentAnalytics.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-white/70 px-4 py-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="size-4 text-brand" />
                    <p className="font-semibold text-ink">{entry.event_name.replaceAll("_", " ")}</p>
                  </div>
                  <p className="mt-2 text-sm text-ink-muted">
                    {(entry.metadata?.status as string | undefined) ??
                      (entry.metadata?.delivery_type as string | undefined) ??
                      "No additional metadata"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-medium text-ink">{entry.created_at.slice(0, 10)}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-muted">
                    {entry.event_id ? "Event-linked" : "Account-level"}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-border bg-canvas px-4 py-5 text-sm leading-6 text-ink-muted">
              No analytics events were recorded in this range.
            </div>
          )}
        </div>
      </DashboardPanel>
    </AdminShell>
  );
}
