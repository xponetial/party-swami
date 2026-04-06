import Link from "next/link";
import { notFound } from "next/navigation";
import { updateAdminUserPlanTierAction } from "@/app/admin/actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  formatAdminCurrency,
  formatAdminDateTime,
  getAdminUserDetail,
  requireAdminAccess,
} from "@/lib/admin";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const [{ profile }, detail] = await Promise.all([requireAdminAccess(), getAdminUserDetail(userId)]);

  if (!detail) {
    notFound();
  }

  return (
    <AdminShell
      currentSection="/admin/users"
      title={detail.user.fullName ?? detail.user.email ?? "User detail"}
      description="Inspect account activity, plan usage, and recent event or AI behavior for this user."
      adminName={profile?.full_name}
      actions={
        <Button asChild variant="secondary">
          <Link href="/admin/users">Back to users</Link>
        </Button>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <DashboardPanel
          title="Account controls"
          description="Use this area to review account metadata and change the user's active plan tier."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Email", value: detail.user.email ?? detail.user.id },
              { label: "Phone", value: detail.user.phone ?? "Not provided" },
              { label: "Created", value: formatAdminDateTime(detail.user.createdAt) },
              { label: "Last activity", value: formatAdminDateTime(detail.user.lastActivityAt) },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-canvas px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-ink">{item.value}</p>
              </div>
            ))}
          </div>

          <form action={updateAdminUserPlanTierAction} className="mt-5 rounded-3xl border border-border bg-white/70 p-4">
            <input name="userId" type="hidden" value={detail.user.id} />
            <p className="text-sm font-semibold text-ink">Change plan tier</p>
            <p className="mt-2 text-sm text-ink-muted">
              The admin gate also uses this field, so setting a user to <span className="font-medium text-ink">admin</span> grants access to the admin workspace.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none"
                defaultValue={detail.user.planTier}
                name="planTier"
              >
                <option value="free">free</option>
                <option value="pro">pro</option>
                <option value="admin">admin</option>
              </select>
              <SubmitButton pendingLabel="Saving plan..." variant="secondary">
                Save plan tier
              </SubmitButton>
            </div>
          </form>
        </DashboardPanel>

        <DashboardPanel
          title="Usage snapshot"
          description="Quick operational context for support, pricing, and AI-cost reviews."
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Events", value: String(detail.user.eventCount) },
              { label: "Monthly requests", value: String(detail.user.monthlyRequests) },
              { label: "Monthly AI cost", value: formatAdminCurrency(detail.user.monthlyCostUsd) },
              { label: "Plan tier", value: detail.user.planTier },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-canvas px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">{item.label}</p>
                <p className="mt-2 text-lg font-semibold text-ink">{item.value}</p>
              </div>
            ))}
          </div>
        </DashboardPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DashboardPanel
          title="Recent events"
          description="The most recent host workspaces connected to this account."
        >
          <div className="space-y-3">
            {detail.recentEvents.length ? (
              detail.recentEvents.map((event) => (
                <div key={event.id} className="rounded-2xl border border-border bg-white/70 px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-ink">{event.title}</p>
                      <p className="mt-1 text-sm text-ink-muted">
                        {event.eventType} | {event.status} | {event.guestCount} guests
                      </p>
                    </div>
                    <Button asChild variant="secondary">
                      <Link href={`/admin/events/${event.id}`}>Open event</Link>
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl bg-canvas px-4 py-5 text-sm text-ink-muted">
                This user does not have recent events yet.
              </div>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Recent AI generations"
          description="Use this to spot expensive or unusual behavior at the account level."
        >
          <div className="space-y-3">
            {detail.recentAi.length ? (
              detail.recentAi.map((generation) => (
                <div key={generation.id} className="rounded-2xl border border-border bg-white/70 px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-ink">{generation.generation_type.replaceAll("_", " ")}</p>
                      <p className="mt-1 text-sm text-ink-muted">
                        {generation.model} | {generation.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-ink">
                        {formatAdminCurrency(Number(generation.estimated_cost_usd ?? 0))}
                      </p>
                      <p className="mt-1 text-sm text-ink-muted">{formatAdminDateTime(generation.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl bg-canvas px-4 py-5 text-sm text-ink-muted">
                No recent AI generations were recorded for this user.
              </div>
            )}
          </div>
        </DashboardPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <DashboardPanel
          title="Recent AI failures"
          description="This isolates the runs that most likely need admin review."
        >
          <div className="space-y-3">
            {detail.recentAiFailures.length ? (
              detail.recentAiFailures.map((generation) => (
                <div key={generation.id} className="rounded-2xl border border-border bg-white/70 px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-ink">{generation.generation_type.replaceAll("_", " ")}</p>
                      <p className="mt-1 text-sm text-ink-muted">
                        {generation.model} | {generation.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-ink">
                        {formatAdminCurrency(Number(generation.estimated_cost_usd ?? 0))}
                      </p>
                      <p className="mt-1 text-sm text-ink-muted">{formatAdminDateTime(generation.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl bg-canvas px-4 py-5 text-sm text-ink-muted">
                No failed or fallback AI generations were recorded for this user.
              </div>
            )}
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Recent invite delivery"
          description="The newest invite or reminder activity across the events this user owns."
        >
          <div className="space-y-3">
            {detail.recentGuestMessages.length ? (
              detail.recentGuestMessages.map((message) => (
                <div key={message.id} className="rounded-2xl border border-border bg-white/70 px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-ink">{message.messageType.replaceAll("_", " ")}</p>
                      <p className="mt-1 text-sm text-ink-muted">
                        {message.eventTitle}
                        {message.guestName ? ` | ${message.guestName}` : ""}
                        {message.guestEmail ? ` | ${message.guestEmail}` : ""}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-muted">
                        {message.channel}
                      </p>
                    </div>
                    <p className="text-sm text-ink-muted">{formatAdminDateTime(message.sentAt)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl bg-canvas px-4 py-5 text-sm text-ink-muted">
                No invite sends or reminders are stored yet for this user&apos;s events.
              </div>
            )}
          </div>
        </DashboardPanel>
      </div>

      <DashboardPanel
        title="Recent product activity"
        description="The latest tracked analytics touching this user account."
      >
        <div className="space-y-3">
          {detail.recentAnalytics.length ? (
            detail.recentAnalytics.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-border bg-white/70 px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-ink">{entry.event_name.replaceAll("_", " ")}</p>
                    <p className="mt-1 text-sm text-ink-muted">
                      {(entry.metadata?.status as string | undefined) ??
                        (entry.metadata?.delivery_type as string | undefined) ??
                        "No additional metadata"}
                    </p>
                  </div>
                  <p className="text-sm text-ink-muted">{formatAdminDateTime(entry.created_at)}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-3xl bg-canvas px-4 py-5 text-sm text-ink-muted">
              No recent analytics events were recorded for this user.
            </div>
          )}
        </div>
      </DashboardPanel>
    </AdminShell>
  );
}
