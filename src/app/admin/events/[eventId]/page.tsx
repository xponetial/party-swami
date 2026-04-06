import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { Button } from "@/components/ui/button";
import {
  formatAdminCurrency,
  formatAdminDateTime,
  getAdminEventDetail,
  requireAdminAccess,
} from "@/lib/admin";

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const [{ profile }, detail] = await Promise.all([requireAdminAccess(), getAdminEventDetail(eventId)]);

  if (!detail) {
    notFound();
  }

  const confirmedGuests = detail.guests.filter((guest) => guest.status === "confirmed").length;
  const pendingGuests = detail.guests.filter((guest) => guest.status === "pending").length;
  const deliveryCount = detail.guestMessages.filter((message) => message.sent_at).length;

  return (
    <AdminShell
      currentSection="/admin/events"
      title={detail.event.title}
      description="Inspect invite delivery, guest movement, analytics, and AI health for one live event workspace."
      adminName={profile?.full_name}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link href="/admin/events">Back to events</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/admin/users/${detail.event.ownerId}`}>Open host</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/events/${detail.event.id}`}>Open host workspace</Link>
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 xl:grid-cols-4">
        {[
          { label: "Host", value: detail.event.hostName ?? detail.event.hostEmail ?? "Unknown host" },
          { label: "Guests", value: String(detail.event.guestCount) },
          { label: "Confirmed seats", value: String(detail.event.confirmedSeats) },
          { label: "Invite sent", value: formatAdminDateTime(detail.event.inviteSentAt) },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-[2rem] border border-white/75 bg-[linear-gradient(140deg,rgba(255,246,255,0.96)_0%,rgba(248,233,255,0.92)_32%,rgba(239,245,255,0.92)_72%,rgba(255,250,244,0.94)_100%)] p-6 shadow-party"
          >
            <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">{item.label}</p>
            <p className="mt-3 text-xl font-semibold text-ink">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <DashboardPanel
          title="Event summary"
          description="Core operational context pulled from the live event tables."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Event type", value: detail.event.eventType },
              { label: "Status", value: detail.event.status },
              { label: "Date", value: formatAdminDateTime(detail.event.eventDate) },
              { label: "Location", value: detail.event.location ?? "Not set" },
              {
                label: "Budget",
                value: detail.event.budget == null ? "Not set" : formatAdminCurrency(detail.event.budget),
              },
              {
                label: "Guest target",
                value: detail.event.guestTarget == null ? "Open" : String(detail.event.guestTarget),
              },
              {
                label: "Plan theme",
                value: detail.planSummary?.theme ?? "Not generated",
              },
              {
                label: "Plan generated",
                value: formatAdminDateTime(detail.planSummary?.generatedAt ?? null),
              },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-canvas px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-ink">{item.value}</p>
              </div>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Guest movement"
          description="A quick read on where the invite and RSVP workflow stands for this event."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Confirmed guests", value: String(confirmedGuests) },
              { label: "Pending guests", value: String(pendingGuests) },
              { label: "Tracked sends", value: String(deliveryCount) },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-canvas px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">{item.label}</p>
                <p className="mt-2 text-xl font-semibold text-ink">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-3xl border border-border bg-white/70 p-4">
            <p className="text-sm font-semibold text-ink">Invite status</p>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              {detail.invite
                ? detail.invite.sent_at
                  ? "This event has a saved invite design and recorded send activity."
                  : "This event has a saved invite design, but no send has been recorded yet."
                : "No invite record exists yet for this event."}
            </p>
          </div>
        </DashboardPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <DashboardPanel
          title="Invite and send history"
          description="Recent invite-related sends for this event, pulled from guest_messages."
        >
          <div className="space-y-3">
            {detail.guestMessages.length ? (
              detail.guestMessages.map((message) => (
                <div key={message.id} className="rounded-2xl border border-border bg-white/70 px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-ink">{message.message_type.replaceAll("_", " ")}</p>
                      <p className="mt-1 text-sm text-ink-muted">
                        {message.subject ?? "No subject saved"}
                        {message.guestName ? ` | ${message.guestName}` : ""}
                        {message.guestEmail ? ` | ${message.guestEmail}` : ""}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-muted">
                        {message.channel}
                      </p>
                    </div>
                    <p className="text-sm text-ink-muted">{formatAdminDateTime(message.sent_at)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl bg-canvas px-4 py-5 text-sm text-ink-muted">
                No invite sends or reminders are stored yet for this event.
              </div>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="AI failures for this event"
          description="Use this when a host reports that AI output felt weak, slow, or inconsistent."
        >
          <div className="space-y-3">
            {detail.aiFailures.length ? (
              detail.aiFailures.map((failure) => (
                <div key={failure.id} className="rounded-2xl border border-border bg-white/70 px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-ink">{failure.generation_type.replaceAll("_", " ")}</p>
                      <p className="mt-1 text-sm text-ink-muted">
                        {failure.model} | {failure.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-ink">
                        {formatAdminCurrency(Number(failure.estimated_cost_usd ?? 0))}
                      </p>
                      <p className="mt-1 text-sm text-ink-muted">{formatAdminDateTime(failure.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl bg-canvas px-4 py-5 text-sm text-ink-muted">
                No AI failures are recorded for this event.
              </div>
            )}
          </div>
        </DashboardPanel>
      </div>

      <DashboardPanel
        title="Recent event analytics"
        description="The last product-level signals recorded specifically against this event."
      >
        <div className="space-y-3">
          {detail.analytics.length ? (
            detail.analytics.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-border bg-white/70 px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-ink">{entry.event_name.replaceAll("_", " ")}</p>
                    <p className="mt-1 text-sm text-ink-muted">
                      {(entry.metadata?.status as string | undefined) ??
                        (entry.metadata?.delivery_type as string | undefined) ??
                        "No extra metadata"}
                    </p>
                  </div>
                  <p className="text-sm text-ink-muted">{formatAdminDateTime(entry.created_at)}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-3xl bg-canvas px-4 py-5 text-sm text-ink-muted">
              No analytics events are stored for this event yet.
            </div>
          )}
        </div>
      </DashboardPanel>
    </AdminShell>
  );
}
