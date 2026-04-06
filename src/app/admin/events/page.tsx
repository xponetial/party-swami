import Link from "next/link";
import { Search } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { formatAdminDateTime, getAdminEvents, requireAdminAccess } from "@/lib/admin";
import { Button } from "@/components/ui/button";

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; type?: string }>;
}) {
  const resolved = await searchParams;
  const [{ profile }, events] = await Promise.all([
    requireAdminAccess(),
    getAdminEvents({
      query: resolved.q,
      status: resolved.status,
      eventType: resolved.type,
    }),
  ]);

  const eventTypes = Array.from(new Set(events.map((event) => event.eventType))).sort((a, b) => a.localeCompare(b));

  return (
    <AdminShell
      currentSection="/admin/events"
      title="Event management"
      description="Inspect live event workspaces, host ownership, invite state, and current guest volume."
      adminName={profile?.full_name}
    >
      <DashboardPanel
        title="Event index"
        description="This first pass focuses on visibility and quick jump-in links to the real event workspaces."
      >
        <form className="mb-5 grid gap-3 rounded-3xl bg-canvas p-4 xl:grid-cols-[1.2fr_0.6fr_0.8fr_auto]">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-ink-muted">
            <Search className="size-4 text-brand" />
            <input
              className="w-full bg-transparent text-sm text-ink outline-none"
              defaultValue={resolved.q ?? ""}
              name="q"
              placeholder="Search by event, type, host, or email"
              type="search"
            />
          </div>
          <select
            className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none"
            defaultValue={resolved.status ?? "all"}
            name="status"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="planning">Planning</option>
            <option value="ready">Ready</option>
            <option value="completed">Completed</option>
          </select>
          <select
            className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none"
            defaultValue={resolved.type ?? "all"}
            name="type"
          >
            <option value="all">All event types</option>
            {eventTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <button className="rounded-full bg-[linear-gradient(135deg,#ff7bd5_0%,#a54dff_36%,#2f8fff_100%)] px-5 py-3 text-sm font-medium text-white shadow-[0_14px_30px_rgba(101,85,176,0.12)]" type="submit">
            Filter events
          </button>
        </form>

        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="rounded-3xl border border-border bg-white/70 p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-lg font-semibold text-ink">{event.title}</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {event.eventType} | {event.hostName ?? "Unknown host"}
                    {event.hostEmail ? ` | ${event.hostEmail}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-canvas px-3 py-1 text-xs uppercase tracking-[0.18em] text-ink-muted">
                    {event.status}
                  </span>
                  <Button asChild variant="secondary">
                    <Link href={`/admin/events/${event.id}`}>Admin detail</Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link href={`/events/${event.id}`}>Open workspace</Link>
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  { label: "Guests", value: String(event.guestCount) },
                  { label: "Confirmed seats", value: String(event.confirmedSeats) },
                  { label: "Invite sent", value: formatAdminDateTime(event.inviteSentAt) },
                  { label: "Created", value: formatAdminDateTime(event.createdAt) },
                  { label: "Updated", value: formatAdminDateTime(event.updatedAt) },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl bg-canvas px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-ink">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DashboardPanel>
    </AdminShell>
  );
}
