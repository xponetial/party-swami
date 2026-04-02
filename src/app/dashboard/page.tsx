import Link from "next/link";
import {
  Activity,
  ClipboardList,
  CalendarDays,
  CheckCircle2,
  Mail,
  PencilLine,
  ReceiptText,
  ShoppingCart,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { deleteEventAction, updateEventStatusAction } from "@/app/events/actions";
import { DashboardMetricCard } from "@/components/dashboard/dashboard-metric-card";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { getAiUsageForUser } from "@/lib/ai/usage";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type DashboardEvent = {
  id: string;
  title: string;
  event_type: string;
  event_date: string | null;
  completed_at: string | null;
  location: string | null;
  guest_target: number | null;
  budget: number | null;
  status: "draft" | "planning" | "ready" | "completed";
};

type DashboardPlan = {
  event_id: string;
  theme: string | null;
  invite_copy: string | null;
  menu: string[] | null;
  tasks: Array<{ title: string; due_label: string }> | null;
  generated_at: string | null;
};

type DashboardAnalyticsEvent = {
  id: string;
  user_id: string | null;
  event_id: string | null;
  event_name: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type DashboardAuditLog = {
  id: string;
  user_id: string | null;
  event_id: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type TelemetryEventLookup = {
  id: string;
  title: string;
};

const EVENT_LIST_SCOPE_OPTIONS = ["active", "completed"] as const;
type EventListScope = (typeof EVENT_LIST_SCOPE_OPTIONS)[number];

const TELEMETRY_SCOPE_OPTIONS = ["all", "analytics", "audit"] as const;
type TelemetryScope = (typeof TELEMETRY_SCOPE_OPTIONS)[number];

const TELEMETRY_ACTIVITY_OPTIONS = [
  { value: "all", label: "All activity" },
  { value: "event_created", label: "Event created" },
  { value: "ai_plan_generated", label: "AI plan generated" },
  { value: "invite_sent", label: "Invite sent" },
  { value: "rsvp_received", label: "RSVP received" },
  { value: "task_completed", label: "Task completed" },
] as const;
type TelemetryActivity = (typeof TELEMETRY_ACTIVITY_OPTIONS)[number]["value"];

function formatEventDate(value: string | null) {
  if (!value) {
    return "Date not set yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCompletedAt(value: string | null) {
  if (!value) {
    return "Completed recently";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCompletedMonth(value: string | null) {
  if (!value) {
    return "Completed recently";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
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

  return `${value.slice(0, maxLength - 3)}...`;
}

function formatCost(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

function formatTelemetryLabel(value: string) {
  return value.replaceAll("_", " ");
}

function getEventNameDetail(eventName: string) {
  switch (eventName) {
    case "event_created":
      return "New host workspaces created";
    case "ai_plan_generated":
      return "Party plans generated from the assistant";
    case "invite_sent":
      return "Invite sends recorded by the email flow";
    case "rsvp_received":
      return "Public RSVP submissions received";
    case "task_completed":
      return "Checklist completions tracked in the workspace";
    default:
      return "Live product telemetry";
  }
}

function stringifyMetadataValue(value: unknown) {
  if (value == null) {
    return null;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
}

function getTelemetryEventLabel(
  eventId: string | null,
  eventTitleById: Map<string, string>,
  fallbackLabel: string,
) {
  if (!eventId) {
    return fallbackLabel;
  }

  return eventTitleById.get(eventId) ?? `Event ${eventId.slice(0, 8)}`;
}

function renderTelemetryEventReference(
  eventId: string | null,
  eventTitleById: Map<string, string>,
  fallbackLabel: string,
) {
  const label = getTelemetryEventLabel(eventId, eventTitleById, fallbackLabel);

  if (!eventId) {
    return <>{label}</>;
  }

  return (
    <Link className="font-medium text-brand hover:underline" href={`/events/${eventId}`}>
      {label}
    </Link>
  );
}

function normalizeTelemetryScope(value: string | undefined): TelemetryScope {
  if (value && TELEMETRY_SCOPE_OPTIONS.includes(value as TelemetryScope)) {
    return value as TelemetryScope;
  }

  return "all";
}

function normalizeTelemetryActivity(value: string | undefined): TelemetryActivity {
  if (
    value &&
    TELEMETRY_ACTIVITY_OPTIONS.some((option) => option.value === value)
  ) {
    return value as TelemetryActivity;
  }

  return "all";
}

function normalizeEventsPage(value: string | undefined) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

function normalizeEventListScope(value: string | undefined): EventListScope {
  if (value && EVENT_LIST_SCOPE_OPTIONS.includes(value as EventListScope)) {
    return value as EventListScope;
  }

  return "active";
}

function buildDashboardFilterHref({
  scope,
  activity,
  eventsPage,
  eventListScope,
}: {
  scope: TelemetryScope;
  activity: TelemetryActivity;
  eventsPage: number;
  eventListScope: EventListScope;
}) {
  const params = new URLSearchParams();

  if (scope !== "all") {
    params.set("telemetry", scope);
  }

  if (activity !== "all") {
    params.set("activity", activity);
  }

  if (eventsPage > 1) {
    params.set("eventsPage", String(eventsPage));
  }

  if (eventListScope !== "active") {
    params.set("eventList", eventListScope);
  }

  const query = params.toString();
  return query ? `/dashboard?${query}` : "/dashboard";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    telemetry?: string;
    activity?: string;
    eventsPage?: string;
    eventList?: string;
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const telemetryScope = normalizeTelemetryScope(resolvedSearchParams.telemetry);
  const telemetryActivity = normalizeTelemetryActivity(resolvedSearchParams.activity);
  const requestedEventsPage = normalizeEventsPage(resolvedSearchParams.eventsPage);
  const eventListScope = normalizeEventListScope(resolvedSearchParams.eventList);
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

  const eventsPerPage = 2;
  const eventRangeStart = (requestedEventsPage - 1) * eventsPerPage;
  const eventRangeEnd = eventRangeStart + eventsPerPage - 1;
  const eventsQuery = supabase
    .from("events")
    .select("id, title, event_type, event_date, completed_at, location, guest_target, budget, status")
    .order("updated_at", { ascending: false })
    .range(eventRangeStart, eventRangeEnd);

  const scopedEventsQuery =
    eventListScope === "completed"
      ? eventsQuery.eq("status", "completed")
      : eventsQuery.neq("status", "completed");

  const eventsCountQuery = supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    [eventListScope === "completed" ? "eq" : "neq"]("status", "completed");
  const activeEventsCountQuery = supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .neq("status", "completed");
  const completedEventsCountQuery = supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("status", "completed");
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
  const recentAnalyticsQuery = supabase
    .from("analytics_events")
    .select("id, user_id, event_id, event_name, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(8)
    .returns<DashboardAnalyticsEvent[]>();
  const recentAuditLogsQuery = supabase
    .from("audit_logs")
    .select("id, user_id, event_id, action, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(8)
    .returns<DashboardAuditLog[]>();
  const eventsCreatedCountQuery = supabase
    .from("analytics_events")
    .select("*", { count: "exact", head: true })
    .eq("event_name", "event_created");
  const plansGeneratedCountQuery = supabase
    .from("analytics_events")
    .select("*", { count: "exact", head: true })
    .eq("event_name", "ai_plan_generated");
  const invitesSentCountQuery = supabase
    .from("analytics_events")
    .select("*", { count: "exact", head: true })
    .eq("event_name", "invite_sent");
  const rsvpsReceivedCountQuery = supabase
    .from("analytics_events")
    .select("*", { count: "exact", head: true })
    .eq("event_name", "rsvp_received");
  const tasksCompletedCountQuery = supabase
    .from("analytics_events")
    .select("*", { count: "exact", head: true })
    .eq("event_name", "task_completed");

  const [
    { data: events = [], error: eventsError },
    { count: eventsCount = 0 },
    { count: activeEventsCount = 0 },
    { count: completedEventsCount = 0 },
    { count: guestsCount = 0 },
    { count: tasksCount = 0 },
    { count: shoppingListsCount = 0 },
    { count: plansCount = 0 },
    { data: latestPlan },
    { data: recentAnalytics = [] },
    { data: recentAuditLogs = [] },
    { count: eventsCreatedCount = 0 },
    { count: plansGeneratedCount = 0 },
    { count: invitesSentCount = 0 },
    { count: rsvpsReceivedCount = 0 },
    { count: tasksCompletedCount = 0 },
  ] = await Promise.all([
    scopedEventsQuery,
    eventsCountQuery,
    activeEventsCountQuery,
    completedEventsCountQuery,
    guestsCountQuery,
    tasksCountQuery,
    shoppingListsCountQuery,
    plansCountQuery,
    latestPlanQuery,
    recentAnalyticsQuery,
    recentAuditLogsQuery,
    eventsCreatedCountQuery,
    plansGeneratedCountQuery,
    invitesSentCountQuery,
    rsvpsReceivedCountQuery,
    tasksCompletedCountQuery,
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
  const safeRecentAnalytics = (recentAnalytics ?? []).filter((entry) =>
    telemetryActivity === "all" ? true : entry.event_name === telemetryActivity,
  );
  const safeRecentAuditLogs = (recentAuditLogs ?? []).filter((entry) => {
    if (telemetryActivity === "all") {
      return true;
    }

    if (telemetryActivity === "rsvp_received") {
      return entry.action === "public_rsvp_submitted";
    }

    return entry.action === telemetryActivity;
  });
  const visibleRecentAnalytics =
    telemetryScope === "audit" ? [] : safeRecentAnalytics;
  const visibleRecentAuditLogs =
    telemetryScope === "analytics" ? [] : safeRecentAuditLogs;
  const telemetryEventIds = Array.from(
    new Set(
      [...visibleRecentAnalytics, ...visibleRecentAuditLogs]
        .map((entry) => entry.event_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const telemetryEvents =
    telemetryEventIds.length > 0
      ? (
          await supabase
            .from("events")
            .select("id, title")
            .in("id", telemetryEventIds)
            .returns<TelemetryEventLookup[]>()
        ).data ?? []
      : [];
  const eventTitleById = new Map<string, string>(
    [
      ...safeEvents.map((event) => [event.id, event.title] as const),
      ...telemetryEvents.map((event) => [event.id, event.title] as const),
    ],
  );
  const latestEvent = safeEvents[0] ?? null;
  const latestPlannedEvent =
    latestPlan ? safeEvents.find((event) => event.id === latestPlan.event_id) ?? null : null;
  const aiMenuCount = latestPlan?.menu?.length ?? 0;
  const aiTaskCount = latestPlan?.tasks?.length ?? 0;
  const usage = await getAiUsageForUser(supabase, user.id);
  const safeEventsCount = eventsCount ?? 0;
  const totalEventPages = Math.max(1, Math.ceil(safeEventsCount / eventsPerPage));
  const eventsPage = Math.min(requestedEventsPage, totalEventPages);
  const canGoToPreviousEventsPage = eventsPage > 1;
  const canGoToNextEventsPage = eventsPage < totalEventPages;
  const completedEventGroups =
    eventListScope === "completed"
      ? Array.from(
          safeEvents.reduce((groups, event) => {
            const label = formatCompletedMonth(event.completed_at);
            const existing = groups.get(label) ?? [];
            existing.push(event);
            groups.set(label, existing);
            return groups;
          }, new Map<string, DashboardEvent[]>()),
        )
      : [];
  const telemetryMetrics = [
    {
      label: "Events created",
      value: String(eventsCreatedCount).padStart(2, "0"),
      detail: getEventNameDetail("event_created"),
      icon: CalendarDays,
    },
    {
      label: "AI plans",
      value: String(plansGeneratedCount).padStart(2, "0"),
      detail: getEventNameDetail("ai_plan_generated"),
      icon: Sparkles,
    },
    {
      label: "Invites sent",
      value: String(invitesSentCount).padStart(2, "0"),
      detail: getEventNameDetail("invite_sent"),
      icon: Mail,
    },
    {
      label: "RSVPs",
      value: String(rsvpsReceivedCount).padStart(2, "0"),
      detail: getEventNameDetail("rsvp_received"),
      icon: Users,
    },
    {
      label: "Tasks done",
      value: String(tasksCompletedCount).padStart(2, "0"),
      detail: getEventNameDetail("task_completed"),
      icon: CheckCircle2,
    },
  ];

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

  const renderEventCard = (event: DashboardEvent) => (
    <div
      key={event.id}
      className={
        event.status === "completed"
          ? "rounded-3xl border border-accent/18 bg-[linear-gradient(135deg,rgba(245,223,255,0.44)_0%,rgba(237,243,255,0.96)_60%,rgba(227,239,255,0.98)_100%)] p-5"
          : "rounded-3xl border border-border bg-[linear-gradient(135deg,rgba(246,226,255,0.36)_0%,rgba(237,243,255,0.94)_54%,rgba(228,239,255,0.98)_100%)] p-5"
      }
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xl font-semibold text-ink">{event.title}</p>
            <Badge variant={event.status === "completed" ? "default" : "success"}>
              {event.status}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-ink-muted">
            {formatEventDate(event.event_date)}
            {event.location ? ` in ${event.location}` : ""}
          </p>
          {event.status === "completed" ? (
            <p className="mt-2 text-sm text-accent">
              Completed {formatCompletedAt(event.completed_at)}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="secondary">
            <Link href={`/events/${event.id}`}>
              <CalendarDays className="size-4" />
              Open
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href={`/events/${event.id}/settings`}>
              <PencilLine className="size-4" />
              Edit
            </Link>
          </Button>
          <form action={updateEventStatusAction}>
            <input name="eventId" type="hidden" value={event.id} />
            <input
              name="nextStatus"
              type="hidden"
              value={event.status === "completed" ? "planning" : "completed"}
            />
            <SubmitButton
              pendingLabel={event.status === "completed" ? "Reopening..." : "Completing..."}
              variant="ghost"
            >
              <CheckCircle2 className="size-4" />
              {event.status === "completed" ? "Reopen" : "Mark complete"}
            </SubmitButton>
          </form>
          <form action={deleteEventAction}>
            <input name="eventId" type="hidden" value={event.id} />
            <SubmitButton pendingLabel="Deleting..." variant="ghost">
              <Trash2 className="size-4" />
              Delete
            </SubmitButton>
          </form>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-canvas px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Type</p>
          <p className="mt-2 font-semibold text-ink">{event.event_type}</p>
        </div>
        <div className="rounded-2xl bg-canvas px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Guest target</p>
          <p className="mt-2 font-semibold text-ink">{event.guest_target ?? "Not set"}</p>
        </div>
        <div className="rounded-2xl bg-canvas px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Budget</p>
          <p className="mt-2 font-semibold text-ink">{formatMoney(event.budget)}</p>
        </div>
        {event.status === "completed" ? (
          <div className="rounded-2xl bg-[rgba(255,255,255,0.36)] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Completed</p>
            <p className="mt-2 font-semibold text-ink">{formatCompletedAt(event.completed_at)}</p>
          </div>
        ) : null}
      </div>
    </div>
  );

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
          title={eventListScope === "completed" ? "Completed events" : "Recent events"}
          description={
            eventListScope === "completed"
              ? "Review finished events and reopen any workspace that needs follow-up."
              : "Open, manage, complete, or remove your current event workspaces without overwhelming the dashboard."
          }
          summaryMeta={`${safeEventsCount} shown scope`}
        >
          <div className="mb-4 flex flex-wrap gap-2">
            {EVENT_LIST_SCOPE_OPTIONS.map((scopeOption) => (
              <Button
                key={scopeOption}
                asChild
                variant={eventListScope === scopeOption ? "primary" : "secondary"}
              >
                <Link
                  href={buildDashboardFilterHref({
                    scope: telemetryScope,
                    activity: telemetryActivity,
                    eventsPage: 1,
                    eventListScope: scopeOption,
                  })}
                >
                  {scopeOption === "active"
                    ? `Active (${activeEventsCount ?? 0})`
                    : `Completed (${completedEventsCount ?? 0})`}
                </Link>
              </Button>
            ))}
          </div>
          {latestEvent ? (
            <div className="space-y-3">
              {eventListScope === "completed"
                ? completedEventGroups.map(([label, eventsInGroup]) => (
                    <div key={label} className="space-y-3">
                      <div className="flex items-center justify-between gap-3 rounded-2xl bg-accent-soft px-4 py-3">
                        <p className="text-sm font-semibold text-ink">{label}</p>
                        <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">
                          {eventsInGroup.length} event{eventsInGroup.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      {eventsInGroup.map((event) => renderEventCard(event))}
                    </div>
                  ))
                : safeEvents.map((event) => renderEventCard(event))}

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border bg-[linear-gradient(135deg,rgba(244,224,255,0.34)_0%,rgba(237,243,255,0.88)_58%,rgba(228,239,255,0.94)_100%)] px-4 py-4">
                <p className="text-sm text-ink-muted">
                  Page {eventsPage} of {totalEventPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    asChild
                    variant="secondary"
                    className={!canGoToPreviousEventsPage ? "pointer-events-none opacity-50" : ""}
                  >
                    <Link
                      aria-disabled={!canGoToPreviousEventsPage}
                      href={buildDashboardFilterHref({
                        scope: telemetryScope,
                        activity: telemetryActivity,
                        eventsPage: Math.max(1, eventsPage - 1),
                        eventListScope,
                      })}
                    >
                      Previous
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="secondary"
                    className={!canGoToNextEventsPage ? "pointer-events-none opacity-50" : ""}
                  >
                    <Link
                      aria-disabled={!canGoToNextEventsPage}
                      href={buildDashboardFilterHref({
                        scope: telemetryScope,
                        activity: telemetryActivity,
                        eventsPage: Math.min(totalEventPages, eventsPage + 1),
                        eventListScope,
                      })}
                    >
                      More
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-border bg-[linear-gradient(135deg,rgba(246,226,255,0.36)_0%,rgba(237,243,255,0.94)_54%,rgba(228,239,255,0.98)_100%)] p-5">
              <p className="text-sm leading-6 text-ink-muted">
                {eventListScope === "completed"
                  ? "No completed events yet. Mark an event complete from the active list and it will appear here."
                  : "Your database connection is working, but there are no active event rows yet. Create your first event and this panel will populate from Supabase."}
              </p>
            </div>
          )}
        </DashboardPanel>

        <DashboardPanel
          title="Latest AI summary"
          description="A quick snapshot of the most recently generated plan stored in `party_plans`."
        >
          {latestPlan ? (
            <div className="space-y-4 rounded-3xl border border-border bg-[linear-gradient(135deg,rgba(246,226,255,0.36)_0%,rgba(237,243,255,0.94)_54%,rgba(228,239,255,0.98)_100%)] p-5">
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

              <div className="rounded-2xl border border-border bg-[rgba(244,247,255,0.9)] px-4 py-4">
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
                      className="flex items-start gap-3 rounded-2xl border border-border bg-[rgba(255,255,255,0.34)] px-4 py-3"
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
            <div className="rounded-3xl border border-border bg-[linear-gradient(135deg,rgba(246,226,255,0.36)_0%,rgba(237,243,255,0.94)_54%,rgba(228,239,255,0.98)_100%)] p-5">
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
        collapsible
        defaultOpen={false}
        summaryMeta="4 checks"
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
              className="flex items-start gap-3 rounded-2xl border border-border bg-[rgba(255,255,255,0.32)] px-4 py-3"
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
        collapsible
        defaultOpen={false}
        summaryMeta={`${usage.monthly.requestsCount} reqs`}
      >
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-border bg-[linear-gradient(135deg,rgba(245,223,255,0.32)_0%,rgba(237,243,255,0.92)_58%,rgba(228,239,255,0.96)_100%)] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Requests</p>
              <p className="mt-2 text-2xl font-semibold text-ink">
                {usage.monthly.requestsCount}
              </p>
            </div>
            <div className="rounded-3xl border border-border bg-[linear-gradient(135deg,rgba(245,223,255,0.32)_0%,rgba(237,243,255,0.92)_58%,rgba(228,239,255,0.96)_100%)] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Estimated cost</p>
              <p className="mt-2 text-2xl font-semibold text-ink">
                {formatCost(usage.monthly.estimatedCostUsd)}
              </p>
            </div>
            <div className="rounded-3xl border border-border bg-[linear-gradient(135deg,rgba(245,223,255,0.32)_0%,rgba(237,243,255,0.92)_58%,rgba(228,239,255,0.96)_100%)] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Input tokens</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{usage.monthly.inputTokens}</p>
            </div>
            <div className="rounded-3xl border border-border bg-[linear-gradient(135deg,rgba(245,223,255,0.32)_0%,rgba(237,243,255,0.92)_58%,rgba(228,239,255,0.96)_100%)] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Cache reuse</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{usage.cacheReuseRate}%</p>
            </div>
            <div className="rounded-3xl border border-border bg-[linear-gradient(135deg,rgba(245,223,255,0.32)_0%,rgba(237,243,255,0.92)_58%,rgba(228,239,255,0.96)_100%)] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Plan tier</p>
              <p className="mt-2 text-2xl font-semibold capitalize text-ink">{usage.planTier}</p>
            </div>
            <div className="rounded-3xl border border-border bg-[linear-gradient(135deg,rgba(245,223,255,0.32)_0%,rgba(237,243,255,0.92)_58%,rgba(228,239,255,0.96)_100%)] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Requests left</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{usage.remaining.requests}</p>
            </div>
            <div className="rounded-3xl border border-border bg-[linear-gradient(135deg,rgba(245,223,255,0.32)_0%,rgba(237,243,255,0.92)_58%,rgba(228,239,255,0.96)_100%)] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Budget left</p>
              <p className="mt-2 text-2xl font-semibold text-ink">
                {formatCost(usage.remaining.costUsd)}
              </p>
            </div>
            <div className="rounded-3xl border border-border bg-[linear-gradient(135deg,rgba(245,223,255,0.32)_0%,rgba(237,243,255,0.92)_58%,rgba(228,239,255,0.96)_100%)] p-4">
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
                  className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-[rgba(255,255,255,0.32)] px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold capitalize text-ink">
                      {generation.generationType.replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">
                      {generation.model} | {generation.status}
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
              <div className="rounded-3xl border border-border bg-[linear-gradient(135deg,rgba(246,226,255,0.34)_0%,rgba(237,243,255,0.92)_54%,rgba(228,239,255,0.98)_100%)] p-5 text-sm leading-6 text-ink-muted">
                AI usage has not been recorded yet for this month. Generate a plan or invite and the
                telemetry will appear here automatically.
              </div>
            )}
          </div>
        </div>
      </DashboardPanel>

      <DashboardPanel
        title="Product telemetry"
        description="Recent analytics events and audit trail entries captured from the live app flows."
        collapsible
        defaultOpen={false}
        summaryMeta={`${visibleRecentAnalytics.length + visibleRecentAuditLogs.length} items`}
      >
        <div className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-5">
            {telemetryMetrics.map((metric) => (
              <DashboardMetricCard key={metric.label} {...metric} />
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-accent-soft p-3 text-accent">
                  <Activity className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">Recent analytics events</p>
                  <p className="text-sm text-ink-muted">
                    Event-level product signals recorded as hosts use the workspace.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {TELEMETRY_SCOPE_OPTIONS.map((scope) => (
                  <Button
                    key={scope}
                    asChild
                    variant={telemetryScope === scope ? "primary" : "secondary"}
                  >
                    <Link
                      href={buildDashboardFilterHref({
                        scope,
                        activity: telemetryActivity,
                        eventsPage,
                        eventListScope,
                      })}
                    >
                      {scope === "all"
                        ? "All"
                        : scope === "analytics"
                          ? "Analytics"
                          : "Audit"}
                    </Link>
                  </Button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {TELEMETRY_ACTIVITY_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    asChild
                    variant={telemetryActivity === option.value ? "primary" : "ghost"}
                  >
                    <Link
                      href={buildDashboardFilterHref({
                        scope: telemetryScope,
                        activity: option.value,
                        eventsPage,
                        eventListScope,
                      })}
                    >
                      {option.label}
                    </Link>
                  </Button>
                ))}
              </div>

              {visibleRecentAnalytics.length ? (
                visibleRecentAnalytics.map((entry) => {
                  const metadataDetails = [
                    stringifyMetadataValue(entry.metadata?.status),
                    stringifyMetadataValue(entry.metadata?.send_mode),
                    stringifyMetadataValue(entry.metadata?.completion_source),
                  ].filter(Boolean);

                  return (
                    <div
                      key={entry.id}
                      className="rounded-2xl border border-border bg-[rgba(255,255,255,0.32)] px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold capitalize text-ink">
                            {formatTelemetryLabel(entry.event_name)}
                          </p>
                          <p className="mt-1 text-sm text-ink-muted">
                            {renderTelemetryEventReference(
                              entry.event_id,
                              eventTitleById,
                              "Account-level signal",
                            )}
                            {metadataDetails.length ? ` | ${metadataDetails.join(" | ")}` : ""}
                          </p>
                        </div>
                        <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">
                          {formatGeneratedAt(entry.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-3xl border border-border bg-[linear-gradient(135deg,rgba(246,226,255,0.34)_0%,rgba(237,243,255,0.92)_54%,rgba(228,239,255,0.98)_100%)] p-5 text-sm leading-6 text-ink-muted">
                  No analytics events match the current filter. Try switching back to all activity
                  or trigger a new product flow to populate this panel.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-accent-soft p-3 text-accent">
                  <ClipboardList className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">Recent audit log entries</p>
                  <p className="text-sm text-ink-muted">
                    Security-friendly action records for key host and guest workflows.
                  </p>
                </div>
              </div>

              {visibleRecentAuditLogs.length ? (
                visibleRecentAuditLogs.map((entry) => {
                  const metadataDetails = [
                    stringifyMetadataValue(entry.metadata?.send_mode),
                    stringifyMetadataValue(entry.metadata?.status),
                    stringifyMetadataValue(entry.metadata?.public_slug),
                  ].filter(Boolean);

                  return (
                    <div
                      key={entry.id}
                      className="rounded-2xl border border-border bg-[rgba(255,255,255,0.32)] px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold capitalize text-ink">
                            {formatTelemetryLabel(entry.action)}
                          </p>
                          <p className="mt-1 text-sm text-ink-muted">
                            {renderTelemetryEventReference(
                              entry.event_id,
                              eventTitleById,
                              "Account-level audit",
                            )}
                            {metadataDetails.length ? ` | ${metadataDetails.join(" | ")}` : ""}
                          </p>
                        </div>
                        <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">
                          {formatGeneratedAt(entry.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-3xl border border-border bg-[linear-gradient(135deg,rgba(246,226,255,0.34)_0%,rgba(237,243,255,0.92)_54%,rgba(228,239,255,0.98)_100%)] p-5 text-sm leading-6 text-ink-muted">
                  No audit log entries match the current filter. Try switching scope or activity to
                  see other recorded actions.
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            {[
              `${visibleRecentAnalytics.length} recent analytics event${visibleRecentAnalytics.length === 1 ? "" : "s"} loaded`,
              `${visibleRecentAuditLogs.length} recent audit log entr${visibleRecentAuditLogs.length === 1 ? "y" : "ies"} loaded`,
              `${rsvpsReceivedCount} RSVP receipt${rsvpsReceivedCount === 1 ? "" : "s"} tracked so far`,
              `${tasksCompletedCount} task completion${tasksCompletedCount === 1 ? "" : "s"} recorded so far`,
            ].map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-2xl border border-border bg-[rgba(255,255,255,0.32)] px-4 py-3"
              >
                <ReceiptText className="mt-0.5 size-4 text-brand" />
                <p className="text-sm leading-6 text-ink-muted">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </DashboardPanel>
    </AppShell>
  );
}
