import { addGuestAction } from "@/app/events/actions";
import { type GuestDetails, type InviteDetails } from "@/lib/events";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";

export function GuestListCard({
  eventId,
  guests,
  invite,
}: {
  eventId: string;
  guests: GuestDetails[];
  invite: InviteDetails | null;
}) {
  const confirmedSeats = guests
    .filter((guest) => guest.status === "confirmed")
    .reduce((sum, guest) => sum + 1 + guest.plus_one_count, 0);
  const respondedCount = guests.filter((guest) => guest.status !== "pending").length;
  const rsvpRate = guests.length ? Math.round((respondedCount / guests.length) * 100) : 0;

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

        <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-border">
          <table className="min-w-full bg-white/80 text-left text-sm">
            <thead className="bg-canvas text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Plus one</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">RSVP link</th>
              </tr>
            </thead>
            <tbody>
              {guests.length ? (
                guests.map((guest) => (
                  <tr key={guest.id} className="border-t border-border">
                    <td className="px-4 py-3 text-ink">{guest.name}</td>
                    <td className="px-4 py-3 text-ink-muted">{guest.status}</td>
                    <td className="px-4 py-3 text-ink-muted">{guest.plus_one_count}</td>
                    <td className="px-4 py-3 text-ink-muted">{guest.email ?? guest.phone ?? "Not provided"}</td>
                    <td className="px-4 py-3 text-ink-muted">
                      {invite?.is_public ? (
                        <span className="break-all text-xs text-brand">
                          {`/rsvp/${invite.public_slug}?guest=${guest.rsvp_token}`}
                        </span>
                      ) : (
                        "Enable public invite first"
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-ink-muted">
                    No guests yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="bg-[#fffaf2]">
        <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Guest analytics</p>
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
      </Card>
    </div>
  );
}
