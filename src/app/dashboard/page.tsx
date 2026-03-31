import Link from "next/link";
import { CalendarDays, CheckCircle2, Mail, ShoppingCart, Users } from "lucide-react";
import { DashboardMetricCard } from "@/components/dashboard/dashboard-metric-card";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { AppShell } from "@/components/layout/app-shell";
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
              Once you sign in, this dashboard will query your `events`, `guests`, `tasks`, and
              `shopping_lists` tables with the Supabase server client and render real values instead
              of placeholder metrics.
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

  const [
    { data: events = [], error: eventsError },
    { count: eventsCount = 0 },
    { count: guestsCount = 0 },
    { count: tasksCount = 0 },
    { count: shoppingListsCount = 0 },
  ] = await Promise.all([
    eventsQuery,
    eventsCountQuery,
    guestsCountQuery,
    tasksCountQuery,
    shoppingListsCountQuery,
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
  ];

  return (
    <AppShell
      title="Dashboard"
      description="This dashboard is now reading live Supabase data on the server for the signed-in user."
      actions={
        <Button asChild>
          <Link href="/events/new">Create event</Link>
        </Button>
      }
    >
      <div className="grid gap-4 xl:grid-cols-4">
        {metrics.map((metric) => (
          <DashboardMetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
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
                  <p className="mt-2 font-semibold">
                    {latestEvent.guest_target ?? "Not set"}
                  </p>
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
          title="Connection status"
          description="Simple live read checks so you can verify frontend-to-database wiring quickly."
        >
          <div className="space-y-3">
            {[
              `Authenticated as ${user.email ?? user.id}`,
              `Loaded ${safeEvents.length} recent event row${safeEvents.length === 1 ? "" : "s"}`,
              `Count query returned ${guestsCount} guest row${guestsCount === 1 ? "" : "s"}`,
              `Count query returned ${tasksCount} task row${tasksCount === 1 ? "" : "s"}`,
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-border bg-white/75 px-4 py-3">
                <Mail className="mt-0.5 size-4 text-brand" />
                <p className="text-sm leading-6 text-ink-muted">{item}</p>
              </div>
            ))}
          </div>
        </DashboardPanel>
      </div>
    </AppShell>
  );
}
