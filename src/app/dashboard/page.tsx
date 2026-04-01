import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Mail,
  ShoppingCart,
  Sparkles,
  Users,
} from "lucide-react";
import { DashboardMetricCard } from "@/components/dashboard/dashboard-metric-card";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { AppShell } from "@/components/layout/app-shell";
import { getAiUsageForUser } from "@/lib/ai/usage";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type DashboardEvent = {
  id: string;
  title: string;
  event_type: string;
  event_date: string | null;
  location: string | null;
  guest_target: number | null;
  budget: number | null;
  status: "draft" | "planning" | "ready";
};

type DashboardPlan = {
  event_id: string;
  theme: string | null;
  invite_copy: string | null;
  menu: string[] | null;
  tasks: Array<{ title: string; due_label: string }> | null;
  generated_at: string | null;
};

function formatEventDate(value: string | null) {
  if (!value) {
    return "Date not set yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatMoney(value: number | null) {
  if (value == null) {
    return "No budget";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatGeneratedAt(value: string | null) {
  if (!value) {
    return "Not generated yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function truncate(value: string | null, maxLength: number) {
  if (!value) {
    return "No AI summary stored yet.";
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}…`;
}

function formatCost(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AppShell
        title="Dashboard"
        description="Connect the frontend to Supabase by signing in, then your event workspace can load directly from the database."
        actions={
          <Button asChild>
            <Link href="/login">Login</Link>
          </Button>
        }
      >
        <DashboardPanel
          title="Sign in to load live data"
          description="Your row-level security policies are in place, so event data only appears for the authenticated owner."
        >
          <div className="rounded-3xl border border-border bg-white/75 p-5">
            <p className="text-sm leading-6 text-ink-muted">
              Once you sign in, this dashboard will query your `events`, `guests`, `tasks`,
              `shopping_lists`, and `party_plans` tables with the Supabase server client and render
              real values instead of placeholder metrics.
            </p>
          </div>
        </DashboardPanel>
      </AppShell>
    );
  }

  const eventsQuery = supabase
    .from("events")
    .select("id, title, event_type, event_date, location, guest_target, budget, status")
    .order("created_at", { ascending: false })
    .limit(5);

  const eventsCountQuery = supabase.from("events").select("*", { count: "exact", head: true });
  const guestsCountQuery = supabase.from("guests").select("*", { count: "exact", head: true });
  const tasksCountQuery = supabase.from("tasks").select("*", { count: "exact", head: true });
  const shoppingListsCountQuery = supabase
    .from("shopping_lists")
    .select("*", { count: "exact", head: true });
  const plansCountQuery = supabase.from("party_plans").select("*", { count: "exact", head: true });
  const latestPlanQuery = supabase
    .from("party_plans")
    .select("event_id, theme, invite_copy, menu, tasks, generated_at")
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle<DashboardPlan>();

  const [
    { data: events = [], error: eventsError },
    { count: eventsCount = 0 },
    { count: guestsCount = 0 },
    { count: tasksCount = 0 },
    { count: shoppingListsCount = 0 },
    { count: plansCount = 0 },
    { data: latestPlan },
  ] = await Promise.all([
    eventsQuery,
    eventsCountQuery,
    guestsCountQuery,
    tasksCountQuery,
    shoppingListsCountQuery,
    plansCountQuery,
    latestPlanQuery,
  ]);

  if (eventsError) {
    return (
      <AppShell
        title="Dashboard"
        description="The frontend is connected to Supabase, but the dashboard query hit an error."
      >
        <DashboardPanel
          title="Unable to load events"
          description="The most common causes are unapplied migrations or auth/session mismatch."
        >
          <div className="rounded-3xl border border-border bg-white/75 p-5">
            <p className="text-sm leading-6 text-ink-muted">{eventsError.message}</p>
          </div>
        </DashboardPanel>
      </AppShell>
    );
  }

  const safeEvents = (events ?? []) as DashboardEvent[];
  const latestEvent = safeEvents[0] ?? null;
  const latestPlannedEvent =
    latestPlan ? safeEvents.find((event) => event.id === latestPlan.event_id) ?? null : null;
  const aiMenuCount = latestPlan?.menu?.length ?? 0;
  const aiTaskCount = latestPlan?.tasks?.length ?? 0;
  const usage = await getAiUsageForUser(supabase, user.id);

  const metrics = [
    {
      label: "Events",
      value: String(eventsCount).padStart(2, "0"),
      detail: eventsCount === 0 ? "No events created yet" : "Live count from your events table",
      icon: CalendarDays,
    },
    {
      label: "Guests",
      value: String(guestsCount).padStart(2, "0"),
      detail: guestsCount === 0 ? "No guests yet" : "Visible through event ownership RLS",
      icon: Users,
    },
    {
      label: "Tasks",
      value: String(tasksCount).padStart(2, "0"),
      detail: tasksCount === 0 ? "No tasks generated yet" : "Loaded from your tasks table",
      icon: CheckCircle2,
    },
    {
      label: "Shopping",
      value: String(shoppingListsCount).padStart(2, "0"),
      detail:
        shoppingListsCount === 0 ? "No shopping lists yet" : "Shopping list records connected",
      icon: ShoppingCart,
    },
    {
      label: "AI Plans",
      value: String(plansCount).padStart(2, "0"),
      detail: plansCount === 0 ? "No generated plans yet" : "Saved in your party_plans table",
      icon: Sparkles,
    },
  ];

  return (
    <AppShell
      title="Dashboard"
      description="This dashboard is now reading live Supabase event data and surfacing the latest AI-generated summary."
      actions={
        <Button asChild>
          <Link href="/events/new">Create event</Link>
        </Button>
      }
    >
      <div className="grid gap-4 xl:grid-cols-5">
        {metrics.map((metric) => (
          <DashboardMetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <DashboardPanel
          title="Latest event"
          description="Pulled from the `events` table using the Supabase server client."
        >
          {latestEvent ? (
            <div className="rounded-3xl border border-border bg-white/75 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xl font-semibold">{latestEvent.title}</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {formatEventDate(latestEvent.event_date)}
                    {latestEvent.location ? ` in ${latestEvent.location}` : ""}
                  </p>
                </div>
                <Badge variant="success">{latestEvent.status}</Badge>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-canvas px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Type</p>
                  <p className="mt-2 font-semibold">{latestEvent.event_type}</p>
                </div>
                <div className="rounded-2xl bg-canvas px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Guest target</p>
                  <p className="mt-2 font-semibold">{latestEvent.guest_target ?? "Not set"}</p>
                </div>
                <div className="rounded-2xl bg-canvas px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Budget</p>
                  <p className="mt-2 font-semibold">{formatMoney(latestEvent.budget)}</p>
                </div>
              </div>

              <div className="mt-4">
                <Button asChild>
                  <Link href={`/events/${latestEvent.id}`}>Open event</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-border bg-white/75 p-5">
              <p className="text-sm leading-6 text-ink-muted">
                Your database connection is working, but there are no event rows yet. Create your
                first event and this panel will populate from Supabase.
              </p>
            </div>
          )}
        </DashboardPanel>

        <DashboardPanel
          title="Latest AI summary"
          description="A quick snapshot of the most recently generated plan stored in `party_plans`."
        >
          {latestPlan ? (
            <div className="space-y-4 rounded-3xl border border-border bg-white/75 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {latestPlannedEvent?.title ?? "Most recently generated event"}
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {formatGeneratedAt(latestPlan.generated_at)}
                  </p>
                </div>
                <Badge variant="success">AI synced</Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-canvas px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Theme</p>
                  <p className="mt-2 font-semibold text-ink">{latestPlan.theme ?? "Not stored"}</p>
                </div>
                <div className="rounded-2xl bg-canvas px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Menu ideas</p>
                  <p className="mt-2 font-semibold text-ink">{aiMenuCount}</p>
                </div>
                <div className="rounded-2xl bg-canvas px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">AI tasks</p>
                  <p className="mt-2 font-semibold text-ink">{aiTaskCount}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-[#fffaf2] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Invite snapshot</p>
                <p className="mt-2 text-sm leading-6 text-ink-muted">
                  {truncate(latestPlan.invite_copy, 180)}
                </p>
              </div>

              {latestPlan.menu?.length ? (
                <div className="space-y-2">
                  {latestPlan.menu.slice(0, 3).map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-3 rounded-2xl border border-border bg-white px-4 py-3"
                    >
                      <Mail className="mt-0.5 size-4 text-brand" />
                      <p className="text-sm leading-6 text-ink-muted">{item}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {latestPlannedEvent ? (
                <Button asChild>
                  <Link href={`/events/${latestPlannedEvent.id}`}>Open AI-planned event</Link>
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="rounded-3xl border border-border bg-white/75 p-5">
              <p className="text-sm leading-6 text-ink-muted">
                Generate a plan from any event and the latest AI summary will show up here with the
                theme, invite snapshot, and suggested menu.
              </p>
            </div>
          )}
        </DashboardPanel>
      </div>

      <DashboardPanel
        title="Connection status"
        description="Simple live read checks so you can verify frontend-to-database wiring quickly."
      >
        <div className="grid gap-3 xl:grid-cols-2">
          {[
            `Authenticated as ${user.email ?? user.id}`,
            `Loaded ${safeEvents.length} recent event row${safeEvents.length === 1 ? "" : "s"}`,
            `Count query returned ${guestsCount} guest row${guestsCount === 1 ? "" : "s"}`,
            `Count query returned ${tasksCount} task row${tasksCount === 1 ? "" : "s"}`,
          ].map((item) => (
            <div
              key={item}
              className="flex items-start gap-3 rounded-2xl border border-border bg-white/75 px-4 py-3"
            >
              <Mail className="mt-0.5 size-4 text-brand" />
              <p className="text-sm leading-6 text-ink-muted">{item}</p>
            </div>
          ))}
        </div>
      </DashboardPanel>

      <DashboardPanel
        title="AI usage this month"
        description="Live telemetry from `ai_generations` and `user_usage_monthly`."
      >
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-border bg-white/75 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Requests</p>
              <p className="mt-2 text-2xl font-semibold text-ink">
                {usage.monthly.requestsCount}
              </p>
            </div>
            <div className="rounded-3xl border border-border bg-white/75 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Estimated cost</p>
              <p className="mt-2 text-2xl font-semibold text-ink">
                {formatCost(usage.monthly.estimatedCostUsd)}
              </p>
            </div>
            <div className="rounded-3xl border border-border bg-white/75 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Input tokens</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{usage.monthly.inputTokens}</p>
            </div>
            <div className="rounded-3xl border border-border bg-white/75 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Cache reuse</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{usage.cacheReuseRate}%</p>
            </div>
            <div className="rounded-3xl border border-border bg-white/75 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Plan tier</p>
              <p className="mt-2 text-2xl font-semibold capitalize text-ink">{usage.planTier}</p>
            </div>
            <div className="rounded-3xl border border-border bg-white/75 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Requests left</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{usage.remaining.requests}</p>
            </div>
            <div className="rounded-3xl border border-border bg-white/75 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Budget left</p>
              <p className="mt-2 text-2xl font-semibold text-ink">
                {formatCost(usage.remaining.costUsd)}
              </p>
            </div>
            <div className="rounded-3xl border border-border bg-white/75 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Monthly cap</p>
              <p className="mt-2 text-2xl font-semibold text-ink">
                {usage.limits.monthlyRequests}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {usage.recent.length ? (
              usage.recent.map((generation) => (
                <div
                  key={generation.id}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-white/75 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold capitalize text-ink">
                      {generation.generationType.replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">
                      {generation.model} · {generation.status}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-ink">
                      {formatCost(generation.estimatedCostUsd)}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-ink-muted">
                      {formatGeneratedAt(generation.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-border bg-white/75 p-5 text-sm leading-6 text-ink-muted">
                AI usage has not been recorded yet for this month. Generate a plan or invite and the
                telemetry will appear here automatically.
              </div>
            )}
          </div>
        </div>
      </DashboardPanel>
    </AppShell>
  );
}
