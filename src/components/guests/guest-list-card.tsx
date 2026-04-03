import Link from "next/link";
import { addGuestAction, deleteGuestAction, importGuestsAction, updateGuestAction } from "@/app/events/actions";
import { InviteSendButton } from "@/components/invite/invite-send-button";
import { type GuestDetails, type GuestMessageDetails, type InviteDetails } from "@/lib/events";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";

export function GuestListCard({
  eventId,
  guests,
  invite,
  guestMessages,
}: {
  eventId: string;
  guests: GuestDetails[];
  invite: InviteDetails | null;
  guestMessages: GuestMessageDetails[];
}) {
  const confirmedSeats = guests
    .filter((guest) => guest.status === "confirmed")
    .reduce((sum, guest) => sum + 1 + guest.plus_one_count, 0);
  const respondedCount = guests.filter((guest) => guest.status !== "pending").length;
  const rsvpRate = guests.length ? Math.round((respondedCount / guests.length) * 100) : 0;
  const acceptedCount = guests.filter((guest) => guest.status === "confirmed").length;
  const pendingCount = guests.filter((guest) => guest.status === "pending").length;
  const emailableGuestCount = guests.filter((guest) => Boolean(guest.email)).length;
  const pendingInviteCount = guests.filter(
    (guest) => Boolean(guest.email) && !guest.last_contacted_at,
  ).length;
  const remindableGuestCount = guests.filter(
    (guest) => Boolean(guest.email) && guest.status === "pending" && guest.last_contacted_at,
  ).length;

  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <Card>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-ink">Guest management</h2>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Add guests directly into Supabase and keep RSVP tracking live on the event.
            </p>
          </div>
        </div>

        <form action={addGuestAction} className="mt-6 grid gap-4 rounded-[1.75rem] bg-canvas p-5 md:grid-cols-2">
          <input type="hidden" name="eventId" value={eventId} />
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="guest-name">Guest name</Label>
            <Input id="guest-name" name="name" placeholder="Jordan Lee" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guest-email">Email</Label>
            <Input id="guest-email" name="email" type="email" placeholder="guest@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guest-phone">Phone</Label>
            <Input id="guest-phone" name="phone" placeholder="555-123-4567" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guest-plus-one">Plus-ones</Label>
            <Input id="guest-plus-one" name="plusOneCount" type="number" min="0" defaultValue="0" />
          </div>
          <div className="md:col-span-2">
            <SubmitButton pendingLabel="Adding guest...">Add guest</SubmitButton>
          </div>
        </form>

        <div className="mt-4 rounded-[1.75rem] border border-border bg-white/80 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">Bulk guest import</p>
              <p className="mt-2 text-sm leading-6 text-ink-muted">
                Download the sample spreadsheet, fill in your full guest list, then upload the CSV to add everyone at once.
              </p>
            </div>
            <Button asChild variant="secondary">
              <Link href="/templates/guest-import-template.csv">Download sample CSV</Link>
            </Button>
          </div>

          <form action={importGuestsAction} className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
            <input type="hidden" name="eventId" value={eventId} />
            <div className="space-y-2">
              <Label htmlFor="guest-csv">Upload completed guest CSV</Label>
              <Input id="guest-csv" name="guestCsv" type="file" accept=".csv,text/csv" required />
            </div>
            <div className="flex items-end">
              <SubmitButton pendingLabel="Importing guests...">Import guest list</SubmitButton>
            </div>
          </form>
        </div>

        <div className="mt-6 grid gap-4">
          {guests.length ? (
            guests.map((guest) => (
              <div key={guest.id} className="rounded-[1.5rem] border border-border bg-white/80 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-ink">{guest.name}</p>
                    <p className="mt-1 text-sm text-ink-muted">
                      {guest.email ?? guest.phone ?? "No contact info yet"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-ink-muted">
                    <span className="rounded-full bg-canvas px-3 py-2">{guest.status}</span>
                    <span className="rounded-full bg-canvas px-3 py-2">
                      Plus-ones: {guest.plus_one_count}
                    </span>
                  </div>
                </div>

                <div className="mt-4 rounded-3xl bg-canvas px-4 py-3 text-sm text-ink-muted">
                  {invite ? (
                    <span className="break-all text-brand">
                      {`/rsvp/${invite.public_slug}?guest=${guest.rsvp_token}`}
                    </span>
                  ) : (
                    "Guest RSVP links will appear here once the invite record is ready."
                  )}
                </div>

                <form action={updateGuestAction} className="mt-4 grid gap-4 md:grid-cols-2">
                  <input type="hidden" name="eventId" value={eventId} />
                  <input type="hidden" name="guestId" value={guest.id} />
                  <div className="space-y-2">
                    <Label htmlFor={`guest-name-${guest.id}`}>Name</Label>
                    <Input id={`guest-name-${guest.id}`} name="name" defaultValue={guest.name} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`guest-status-${guest.id}`}>Status</Label>
                    <select
                      id={`guest-status-${guest.id}`}
                      name="status"
                      defaultValue={guest.status}
                      className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand/50 focus:ring-4 focus:ring-brand/10"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="declined">Declined</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`guest-email-${guest.id}`}>Email</Label>
                    <Input id={`guest-email-${guest.id}`} name="email" type="email" defaultValue={guest.email ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`guest-phone-${guest.id}`}>Phone</Label>
                    <Input id={`guest-phone-${guest.id}`} name="phone" defaultValue={guest.phone ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`guest-plus-one-${guest.id}`}>Plus-ones</Label>
                    <Input
                      id={`guest-plus-one-${guest.id}`}
                      name="plusOneCount"
                      type="number"
                      min="0"
                      defaultValue={String(guest.plus_one_count)}
                    />
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <SubmitButton pendingLabel="Saving guest..." variant="secondary">
                      Save guest
                    </SubmitButton>
                  </div>
                </form>

                <form action={deleteGuestAction} className="mt-3">
                  <input type="hidden" name="eventId" value={eventId} />
                  <input type="hidden" name="guestId" value={guest.id} />
                  <SubmitButton pendingLabel="Removing guest..." variant="ghost">
                    Remove guest
                  </SubmitButton>
                </form>
              </div>
            ))
          ) : (
            <div className="rounded-[1.5rem] border border-border bg-white/80 p-6 text-center text-ink-muted">
              No guests yet.
            </div>
          )}
        </div>
      </Card>

      <Card className="bg-[rgba(244,247,255,0.9)]">
        <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Guest activity</p>
        <h3 className="mt-3 text-xl font-semibold text-ink">RSVP tracking and delivery state</h3>
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
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl bg-white/85 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">RSVP rate</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{rsvpRate}%</p>
          </div>
          <div className="rounded-3xl bg-white/85 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Confirmed seats</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{confirmedSeats}</p>
          </div>
          <div className="rounded-3xl bg-white/85 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Recent replies</p>
            <p className="mt-2 text-2xl font-semibold text-ink">{respondedCount}</p>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {guests.length ? (
            guests.slice(0, 3).map((guest) => (
              <div
                key={guest.id}
                className="flex items-center justify-between rounded-3xl border border-border bg-white/85 px-4 py-3"
              >
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
                <span className="text-sm font-medium capitalize text-brand">{guest.status}</span>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-border bg-white/85 p-4 text-sm text-ink-muted">
              Add guests before sending the invite.
            </div>
          )}
          {[
            "Guests added here are immediately visible on the event overview and invite screen.",
            "RLS still restricts all rows to the signed-in event owner.",
            "When the invite is public, each guest gets a live RSVP link tied to their token.",
          ].map((item) => (
            <div key={item} className="rounded-3xl border border-border bg-white/85 p-4 text-sm leading-6 text-ink-muted">
              {item}
            </div>
          ))}
        </div>
        {invite ? (
          <div className="mt-5">
            <InviteSendButton
              eventId={eventId}
              pendingInviteCount={pendingInviteCount}
              remindableGuestCount={remindableGuestCount}
              emailableGuestCount={emailableGuestCount}
            />
          </div>
        ) : null}
        <div className="mt-6">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Recent delivery log</p>
          <div className="mt-3 space-y-3">
            {guestMessages.length ? (
              guestMessages.map((message) => (
                <div key={message.id} className="rounded-3xl border border-border bg-white/85 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-ink">{message.guest?.name ?? "Guest"}</p>
                        <span className="rounded-full bg-canvas px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-ink-muted">
                          {message.message_type}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-ink-muted">
                        {message.guest?.email ?? "No email saved"}
                      </p>
                    </div>
                    <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">
                      {message.sent_at ? new Date(message.sent_at).toLocaleString("en-US") : "Draft"}
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-ink-muted">
                    {message.subject ?? "Invite email sent"}
                  </p>
                  {message.metadata?.send_mode ? (
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-ink-muted">
                      {String(message.metadata.send_mode).replaceAll("_", " ")}
                    </p>
                  ) : null}
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
        <div className="mt-6 rounded-3xl border border-border bg-white/85 p-4">
          <p className="text-sm leading-6 text-ink-muted">
            Need to fine-tune the visual invite first? You can jump back to the invitation
            generator any time before sending.
          </p>
          <Button asChild className="mt-3">
            <Link href={`/events/${eventId}/invite`}>Back to invitation generator</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
