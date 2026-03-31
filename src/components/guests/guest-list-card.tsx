import { Card } from "@/components/ui/card";

const guests = [
  { name: "Jordan Lee", status: "Confirmed", plusOne: "1", channel: "Email" },
  { name: "Taylor Cruz", status: "Pending", plusOne: "0", channel: "Share link" },
  { name: "Morgan Shah", status: "Declined", plusOne: "0", channel: "SMS" },
  { name: "Avery Patel", status: "Confirmed", plusOne: "1", channel: "Email" },
];

export function GuestListCard() {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <Card>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-ink">Guest management</h2>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Add guests, import a list, share a public RSVP link, and keep communication history in one place.
            </p>
          </div>
          <div className="flex gap-2">
            {["Add guest", "Import CSV", "Share RSVP link"].map((item) => (
              <button
                key={item}
                type="button"
                disabled
                className="rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-ink opacity-80"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-border">
          <table className="min-w-full bg-white/80 text-left text-sm">
            <thead className="bg-canvas text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Plus one</th>
                <th className="px-4 py-3 font-medium">Channel</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((guest) => (
                <tr key={guest.name} className="border-t border-border">
                  <td className="px-4 py-3 text-ink">{guest.name}</td>
                  <td className="px-4 py-3 text-ink-muted">{guest.status}</td>
                  <td className="px-4 py-3 text-ink-muted">{guest.plusOne}</td>
                  <td className="px-4 py-3 text-ink-muted">{guest.channel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="bg-[#fffaf2]">
        <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Guest analytics</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl bg-white/85 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">RSVP rate</p>
            <p className="mt-2 text-2xl font-semibold text-ink">71%</p>
          </div>
          <div className="rounded-3xl bg-white/85 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Confirmed seats</p>
            <p className="mt-2 text-2xl font-semibold text-ink">18</p>
          </div>
          <div className="rounded-3xl bg-white/85 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Recent replies</p>
            <p className="mt-2 text-2xl font-semibold text-ink">4</p>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {[
            "Send a reminder to everyone still pending",
            "Re-open one declined guest slot for the waitlist",
            "Export the guest list for venue check-in",
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
