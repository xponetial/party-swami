import { saveInviteAction } from "@/app/events/actions";
import {
  type EventDetails,
  type GuestDetails,
  type GuestMessageDetails,
  type InviteDetails,
} from "@/lib/events";
import { AiGenerateButton } from "@/components/ai/ai-generate-button";
import { InviteSendButton } from "@/components/invite/invite-send-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";

export function InvitePreviewCard({
  event,
  invite,
  guests,
  guestMessages,
}: {
  event: EventDetails;
  invite: InviteDetails | null;
  guests: GuestDetails[];
  guestMessages: GuestMessageDetails[];
}) {
  const acceptedCount = guests.filter((guest) => guest.status === "confirmed").length;
  const pendingCount = guests.filter((guest) => guest.status === "pending").length;
  const shareUrl = invite ? `/rsvp/${invite.public_slug}` : "No invite yet";

  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <Card className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-dashed border-border bg-canvas p-6">
          <Badge>Invite editor</Badge>
          <h2 className="mt-6 text-3xl font-semibold text-ink">{event.title}</h2>
          <p className="mt-4 text-sm leading-7 text-ink-muted">
            {invite?.invite_copy ?? "Write the invitation message to start sharing this event."}
          </p>
          <div className="mt-6 space-y-3">
            {[
              event.event_date ? new Date(event.event_date).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" }) : "Event date coming soon",
              event.location ?? "Location coming soon",
              invite ? (invite.is_public ? `Public RSVP link ready: ${shareUrl}` : "Invite is private until you enable public sharing.") : "Invite record not created yet",
            ].map((item) => (
              <div key={item} className="rounded-2xl bg-white/90 px-4 py-3 text-sm text-ink">
                {item}
              </div>
            ))}
          </div>
        </div>

        {invite ? (
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Message controls</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-semibold text-ink">Edit the live invite copy</h3>
              <AiGenerateButton
                endpoint="/api/ai/generate-invite-copy"
                eventId={event.id}
                label="Regenerate with AI"
                pendingLabel="Generating copy..."
                variant="ghost"
              />
            </div>
            <form action={saveInviteAction} className="mt-4">
              <input type="hidden" name="eventId" value={event.id} />
              <input type="hidden" name="inviteId" value={invite.id} />
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-copy">Invite message</Label>
                  <textarea
                    id="invite-copy"
                    name="inviteCopy"
                    defaultValue={invite.invite_copy ?? ""}
                    className="min-h-48 w-full rounded-[1.75rem] border border-border bg-[#fffaf2] p-5 text-sm leading-7 text-ink-muted outline-none transition focus:border-brand/50 focus:ring-4 focus:ring-brand/10"
                    required
                  />
                </div>
                <label className="flex items-center gap-3 rounded-2xl border border-border bg-white/85 px-4 py-3 text-sm text-ink">
                  <input
                    type="checkbox"
                    name="isPublic"
                    value="true"
                    defaultChecked={invite.is_public}
                    className="size-4 accent-[var(--brand)]"
                  />
                  Enable public RSVP link
                </label>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <SubmitButton pendingLabel="Saving invite..." variant="secondary">
                  Save invite copy
                </SubmitButton>
              </div>
            </form>
          </div>
        ) : (
          <div>
            <p className="text-sm text-ink-muted">No invite record was found for this event yet.</p>
          </div>
        )}
      </Card>

      <Card className="bg-[#fffaf2]">
        <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Guest activity</p>
        <h3 className="mt-3 text-xl font-semibold text-ink">RSVP tracking and send state</h3>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl bg-white/85 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Accepted</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{acceptedCount}</p>
          </div>
          <div className="rounded-3xl bg-white/85 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Pending</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{pendingCount}</p>
          </div>
          <div className="rounded-3xl bg-white/85 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Sent state</p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {invite?.sent_at ? new Date(invite.sent_at).toLocaleString("en-US") : "Not sent yet"}
            </p>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {guests.length ? (
            guests.slice(0, 3).map((guest) => (
              <div key={guest.id} className="flex items-center justify-between rounded-3xl border border-border bg-white/85 px-4 py-3">
                <div>
                  <p className="font-medium text-ink">{guest.name}</p>
                  <p className="text-sm text-ink-muted">
                    {guest.email ?? guest.phone ?? "No contact yet"}
                  </p>
                  <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">
                    {guest.last_contacted_at
                      ? `Last contacted ${new Date(guest.last_contacted_at).toLocaleString("en-US")}`
                      : "No delivery logged yet"}
                  </p>
                </div>
                <span className="text-sm font-medium text-brand">{guest.status}</span>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-border bg-white/85 p-4 text-sm text-ink-muted">
              Add guests before sending the invite.
            </div>
          )}
        </div>
        {invite ? <div className="mt-5"><InviteSendButton eventId={event.id} /></div> : null}
        <div className="mt-6">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Recent delivery log</p>
          <div className="mt-3 space-y-3">
            {guestMessages.length ? (
              guestMessages.map((message) => (
                <div key={message.id} className="rounded-3xl border border-border bg-white/85 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink">
                        {message.guest?.name ?? "Guest"}
                      </p>
                      <p className="mt-1 text-sm text-ink-muted">
                        {message.guest?.email ?? "No email saved"}
                      </p>
                    </div>
                    <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">
                      {message.sent_at
                        ? new Date(message.sent_at).toLocaleString("en-US")
                        : "Draft"}
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-ink-muted">
                    {message.subject ?? "Invite email sent"}
                  </p>
                  {message.metadata?.rsvp_url ? (
                    <p className="mt-2 break-all text-xs text-brand">{message.metadata.rsvp_url}</p>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-border bg-white/85 p-4 text-sm text-ink-muted">
                No invite deliveries have been logged yet.
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
