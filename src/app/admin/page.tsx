import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bot,
  CalendarDays,
  Mail,
  ShoppingCart,
  Users,
} from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import {
  formatAdminDateTime,
  getAdminOverviewMetrics,
  normalizeAdminRange,
  requireAdminAccess,
} from "@/lib/admin";
import { Button } from "@/components/ui/button";

const rangeOptions = [
  { label: "7 days", value: "7" },
  { label: "30 days", value: "30" },
  { label: "90 days", value: "90" },
] as const;

const metricIcons = [Users, CalendarDays, Mail, Activity, ShoppingCart, Bot] as const;

const laneLinks = [
  { href: "/admin/analytics", label: "Analytics", detail: "Funnels, trendlines, and conversion quality." },
  { href: "/admin/ai", label: "AI Control", detail: "Cost, fallback, and reliability visibility." },
  { href: "/admin/users", label: "Users", detail: "Plans, usage, and support-ready account detail." },
  { href: "/admin/events", label: "Events", detail: "Live host workspaces and invite delivery health." },
  { href: "/admin/templates", label: "Templates", detail: "Catalog visibility with real previews and controls." },
] as const;

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const resolved = await searchParams;
  const rangeDays = normalizeAdminRange(resolved.range);
  const [{ profile }, overview] = await Promise.all([
    requireAdminAccess(),
    getAdminOverviewMetrics(rangeDays),
  ]);

  const [primaryMetrics, supportingMetrics] = [
    overview.metrics.slice(0, 3),
    overview.metrics.slice(3),
  ];
  const lastActivityAt = overview.activity[0]?.createdAt ?? null;
  const attentionCount = supportingMetrics.filter((metric) => metric.value === "0").length;

  return (
    <AdminShell
      currentSection="/admin"
      title="Admin overview"
      description="A cleaner command center for product health, host movement, and the systems we need to watch every day."
      adminName={profile?.full_name}
      actions={
        <div className="flex flex-wrap gap-2">
          {rangeOptions.map((option) => (
            <Button
              key={option.value}
              asChild
              variant={rangeDays === Number(option.value) ? "primary" : "secondary"}
            >
              <Link href={option.value === "30" ? "/admin" : `/admin?range=${option.value}`}>
                {option.label}
              </Link>
            </Button>
          ))}
        </div>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <DashboardPanel
          title="What matters right now"
          description={`A ${rangeDays}-day operating snapshot across growth, delivery, RSVP movement, shopping intent, and AI demand.`}
        >
          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[2rem] bg-canvas p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Daily pulse</p>
              <h3 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
                Party Genie is in active-use mode, and the admin view now needs to answer where the product is healthy versus where it needs help.
              </h3>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {primaryMetrics.map((metric, index) => {
                  const Icon = metricIcons[index];

                  return (
                    <div key={metric.label} className="rounded-2xl bg-white/80 px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">{metric.label}</p>
                        <div className="rounded-2xl bg-accent-soft p-2 text-accent">
                          <Icon className="size-4" />
                        </div>
                      </div>
                      <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">{metric.value}</p>
                      <p className="mt-2 text-sm leading-6 text-ink-muted">{metric.detail}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-[2rem] border border-border bg-white/70 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">System health</p>
                <div className="mt-4 grid gap-3">
                  <div className="flex items-center justify-between rounded-2xl bg-canvas px-4 py-3">
                    <span className="text-sm text-ink-muted">Latest system activity</span>
                    <span className="text-sm font-semibold text-ink">{formatAdminDateTime(lastActivityAt)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-canvas px-4 py-3">
                    <span className="text-sm text-ink-muted">Tracked lanes needing attention</span>
                    <span className="text-sm font-semibold text-ink">{attentionCount}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-canvas px-4 py-3">
                    <span className="text-sm text-ink-muted">Range under review</span>
                    <span className="text-sm font-semibold text-ink">Last {rangeDays} days</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-border bg-[linear-gradient(135deg,rgba(38,146,255,0.96),rgba(139,70,255,0.92))] p-5 text-white">
                <p className="text-xs uppercase tracking-[0.18em] text-white/70">Operator note</p>
                <p className="mt-3 text-lg font-semibold">
                  Keep the overview focused on signal, then use the deeper pages for actual intervention.
                </p>
                <p className="mt-2 text-sm leading-6 text-white/85">
                  That keeps this screen readable while still giving admins a fast path into users, events, AI, and templates.
                </p>
              </div>
            </div>
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Operational watch list"
          description="These support metrics help us spot where the product may be getting friction."
        >
          <div className="grid gap-3">
            {supportingMetrics.map((metric, index) => {
              const Icon = metricIcons[index + primaryMetrics.length];

              return (
                <div
                  key={metric.label}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-white/70 px-4 py-4"
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">{metric.label}</p>
                    <p className="mt-3 text-2xl font-semibold text-ink">{metric.value}</p>
                    <p className="mt-2 text-sm leading-6 text-ink-muted">{metric.detail}</p>
                  </div>
                  <div className="rounded-2xl bg-accent-soft p-3 text-accent">
                    <Icon className="size-[18px]" />
                  </div>
                </div>
              );
            })}
          </div>
        </DashboardPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <DashboardPanel
          title="Recent system activity"
          description={`The latest telemetry and audit moments from the last ${rangeDays} days.`}
        >
          <div className="space-y-3">
            {overview.activity.length ? (
              overview.activity.map((item, index) => (
                <div
                  key={`${item.kind}-${item.id}`}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-white/70 px-4 py-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-canvas px-3 py-1 text-xs uppercase tracking-[0.18em] text-ink-muted">
                        {item.kind}
                      </span>
                      {index === 0 ? (
                        <span className="rounded-full bg-accent-soft px-3 py-1 text-xs uppercase tracking-[0.18em] text-accent">
                          Latest
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 font-semibold text-ink">{item.label}</p>
                    <p className="mt-1 text-sm leading-6 text-ink-muted">{item.detail}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium text-ink">{formatAdminDateTime(item.createdAt)}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-muted">
                      {item.eventTitle ?? "Account level"}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-border bg-canvas px-4 py-5 text-sm leading-6 text-ink-muted">
                No admin activity has been captured in this window yet.
              </div>
            )}
          </div>
        </DashboardPanel>

        <div className="grid gap-4">
          <DashboardPanel
            title="Top event types"
            description="The occasion types currently driving the most host activity."
          >
            <div className="space-y-3">
              {overview.topEventTypes.length ? (
                overview.topEventTypes.map((item, index) => (
                  <div key={item.label} className="rounded-2xl bg-canvas px-4 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">#{index + 1}</p>
                        <p className="mt-2 font-semibold text-ink">{item.label}</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-ink">
                        {item.count}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-ink-muted">No event types were created in this range yet.</p>
              )}
            </div>
          </DashboardPanel>

          <DashboardPanel
            title="Top invite templates"
            description="The designs hosts are actually selecting most often right now."
          >
            <div className="space-y-3">
              {overview.topTemplates.length ? (
                overview.topTemplates.map((item, index) => (
                  <div key={item.label} className="rounded-2xl bg-canvas px-4 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">#{index + 1}</p>
                        <p className="mt-2 font-semibold text-ink">{item.label}</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-ink">
                        {item.count}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-ink-muted">No invite template usage is recorded yet.</p>
              )}
            </div>
          </DashboardPanel>
        </div>
      </div>

      <DashboardPanel
        title="Admin lanes"
        description="These are the first internal systems we should keep tightening before we expand into revenue, growth, or experimentation."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {laneLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-3xl border border-border bg-white/70 p-5 transition hover:border-brand/25 hover:bg-white"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-lg font-semibold text-ink">{item.label}</p>
                <ArrowRight className="size-4 text-brand transition group-hover:translate-x-0.5" />
              </div>
              <p className="mt-2 text-sm leading-6 text-ink-muted">{item.detail}</p>
            </Link>
          ))}
        </div>
      </DashboardPanel>
    </AdminShell>
  );
}
