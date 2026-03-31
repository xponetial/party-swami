import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const guests = [
  { name: "Jordan Lee", status: "Confirmed" },
  { name: "Taylor Cruz", status: "Pending" },
  { name: "Morgan Shah", status: "Maybe" },
];

export function InvitePreviewCard() {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <Card className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-dashed border-border bg-canvas p-6">
          <Badge>Invite editor</Badge>
          <h2 className="mt-6 text-3xl font-semibold text-ink">Garden Party Invitation</h2>
          <p className="mt-4 text-sm leading-7 text-ink-muted">
            Celebrate under the string lights with flower crowns, brunch bites, and a sunny afternoon in the garden.
          </p>
          <div className="mt-6 space-y-3">
            {["Saturday, June 13 at 2:00 PM", "The Lee Family Garden, Austin", "Tap to RSVP by June 4"].map((item) => (
              <div key={item} className="rounded-2xl bg-white/90 px-4 py-3 text-sm text-ink">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Message controls</p>
          <h3 className="mt-3 text-xl font-semibold text-ink">AI invite copy with room for edits</h3>
          <div className="mt-4 rounded-[1.75rem] bg-[#fffaf2] p-5 text-sm leading-7 text-ink-muted">
            We&apos;re celebrating Ava turning eight with citrus sweets, games in the grass, and a garden full of friends. We would love to have you there.
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {["Send invite", "Copy share link", "Schedule reminder", "Preview RSVP page"].map((item) => (
              <button
                key={item}
                type="button"
                disabled
                className="rounded-full border border-border bg-white px-4 py-3 text-sm font-medium text-ink opacity-80"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="bg-[#fffaf2]">
        <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Guest activity</p>
        <h3 className="mt-3 text-xl font-semibold text-ink">RSVP tracking and reminders</h3>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl bg-white/85 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Accepted</p>
            <p className="mt-2 text-2xl font-semibold text-ink">16</p>
          </div>
          <div className="rounded-3xl bg-white/85 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Pending</p>
            <p className="mt-2 text-2xl font-semibold text-ink">3</p>
          </div>
          <div className="rounded-3xl bg-white/85 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Recent messages</p>
            <p className="mt-2 text-2xl font-semibold text-ink">7</p>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {guests.map((guest) => (
            <div key={guest.name} className="flex items-center justify-between rounded-3xl border border-border bg-white/85 px-4 py-3">
              <div>
                <p className="font-medium text-ink">{guest.name}</p>
                <p className="text-sm text-ink-muted">Last touchpoint: text reminder</p>
              </div>
              <span className="text-sm font-medium text-brand">{guest.status}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
