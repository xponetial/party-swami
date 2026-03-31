import { updateProfileAction } from "@/app/events/actions";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { getEventContext } from "@/lib/events";

export default async function EventSettingsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { event, profile } = await getEventContext(eventId);

  return (
    <AppShell
      title="Security and settings"
      description="Profile, privacy, event visibility, and trust-oriented controls grounded in live Supabase data."
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
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-3xl border border-border bg-white/80 px-4 py-4">
                <p className="text-sm text-ink-muted">{label}</p>
                <p className="text-sm font-medium text-ink">{value}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-[#fffaf2]">
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
    </AppShell>
  );
}
