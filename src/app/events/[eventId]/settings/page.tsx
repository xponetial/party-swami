import { restorePlanVersionAction, updateProfileAction } from "@/app/events/actions";
import { getAiUsageForUser } from "@/lib/ai/usage";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { getEventContext } from "@/lib/events";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function EventSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams?: Promise<{ restoreError?: string; restoreSuccess?: string }>;
}) {
  const { eventId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const { event, profile, plan, planVersions } = await getEventContext(eventId);
  const supabase = await createSupabaseServerClient();
  const usage = profile?.id ? await getAiUsageForUser(supabase, profile.id) : null;

  return (
    <AppShell
      title="Security and settings"
      description="Profile, privacy, event visibility, and trust-oriented controls grounded in live Supabase data."
      backHref={`/events/${eventId}`}
    >
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <h2 className="text-xl font-semibold text-ink">Account and security</h2>
          <form action={updateProfileAction} className="mt-5 space-y-4">
            <input type="hidden" name="eventId" value={eventId} />
            <div className="space-y-2">
              <Label htmlFor="full-name">Profile name</Label>
              <Input
                id="full-name"
                name="fullName"
                defaultValue={profile?.full_name ?? ""}
                placeholder="Jordan Lee"
                required
              />
            </div>
            <SubmitButton pendingLabel="Saving profile..." variant="secondary">
              Save profile
            </SubmitButton>
          </form>
          <div className="mt-5 grid gap-3">
            {[
              ["Event", event.title],
              ["Type", event.event_type],
              ["Status", event.status],
              ["Budget", event.budget != null ? `$${event.budget}` : "Not set"],
              ["Plan tier", profile?.plan_tier ?? "free"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-3xl border border-border bg-white/80 px-4 py-4">
                <p className="text-sm text-ink-muted">{label}</p>
                <p className="text-sm font-medium text-ink">{value}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-[rgba(244,247,255,0.9)]">
          <h2 className="text-xl font-semibold text-ink">Privacy and consent</h2>
          <div className="mt-5 grid gap-3">
            {[
              "Guest data remains protected by row-level security and is only visible to the owning host session.",
              "Invite sharing is controlled by the event's public invite toggle and per-event public slug.",
              "Payment methods are not yet stored in the app, keeping checkout integrations decoupled from host profile data.",
              "Profile updates on this screen write directly to the Supabase profiles table.",
            ].map((item) => (
              <div key={item} className="rounded-3xl border border-border bg-white/85 p-4 text-sm leading-6 text-ink-muted">
                {item}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <h2 className="text-xl font-semibold text-ink">AI planning status</h2>
          <div className="mt-5 grid gap-3">
            {[
              ["Current theme", plan?.theme ?? event.theme ?? "Not generated yet"],
              ["AI model", plan?.model ?? "Not stored yet"],
              ["Prompt version", plan?.prompt_version ?? "Not stored yet"],
              ["Last generated", plan?.generated_at ? new Date(plan.generated_at).toLocaleString("en-US") : "Not generated yet"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-3xl border border-border bg-white/80 px-4 py-4">
                <p className="text-sm text-ink-muted">{label}</p>
                <p className="text-sm font-medium text-ink">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-3xl border border-border bg-canvas p-4 text-sm leading-6 text-ink-muted">
            {plan?.summary ??
              "Generate or revise a plan to start tracking model, prompt version, and revision metadata here."}
          </div>
          {usage ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-border bg-white/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Tier</p>
                <p className="mt-2 text-lg font-semibold capitalize text-ink">{usage.planTier}</p>
              </div>
              <div className="rounded-3xl border border-border bg-white/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Requests left</p>
                <p className="mt-2 text-lg font-semibold text-ink">{usage.remaining.requests}</p>
              </div>
            </div>
          ) : null}
        </Card>

        <Card className="bg-[rgba(244,247,255,0.9)]">
          <h2 className="text-xl font-semibold text-ink">Recent plan revisions</h2>
          {resolvedSearchParams.restoreSuccess ? (
            <div className="mt-4 rounded-3xl border border-accent/20 bg-accent-soft px-4 py-3 text-sm text-accent">
              Restored saved plan version {resolvedSearchParams.restoreSuccess}. The event workspace now reflects that snapshot.
            </div>
          ) : null}
          {resolvedSearchParams.restoreError ? (
            <div className="mt-4 rounded-3xl border border-brand/20 bg-brand/10 px-4 py-3 text-sm text-brand">
              {resolvedSearchParams.restoreError}
            </div>
          ) : null}
          <div className="mt-5 grid gap-3">
            {planVersions.length ? (
              planVersions.map((version) => (
                <div key={version.id} className="rounded-3xl border border-border bg-white/85 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-ink">Version {version.version_num}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">
                      {new Date(version.created_at).toLocaleString("en-US")}
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-ink-muted">
                    {version.change_reason ?? "Saved snapshot before a new AI-generated plan update."}
                  </p>
                  <form action={restorePlanVersionAction} className="mt-4">
                    <input type="hidden" name="eventId" value={eventId} />
                    <input type="hidden" name="versionId" value={version.id} />
                    <SubmitButton pendingLabel={`Restoring version ${version.version_num}...`} variant="secondary">
                      Restore this version
                    </SubmitButton>
                  </form>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-border bg-white/85 p-4 text-sm leading-6 text-ink-muted">
                No saved revisions yet. Once you revise an AI plan, earlier versions will appear here so the host can track the change history.
              </div>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
