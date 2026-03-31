import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import {
  type EventDetails,
  type GuestDetails,
  type InviteDetails,
  type PartyPlanDetails,
  type ShoppingItemDetails,
  type TaskDetails,
} from "@/lib/events";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type EventWorkspaceOverviewProps = {
  eventId: string;
  event: EventDetails;
  invite: InviteDetails | null;
  plan: PartyPlanDetails | null;
  guests: GuestDetails[];
  shoppingItems: ShoppingItemDetails[];
  tasks: TaskDetails[];
};

export function EventWorkspaceOverview({
  eventId,
  event,
  invite,
  plan,
  guests,
  shoppingItems,
  tasks,
}: EventWorkspaceOverviewProps) {
  const menuIdeas = plan?.menu ?? [];
  const planTasks = tasks.slice(0, 4);
  const previewGuests = guests.slice(0, 3);

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="bg-white/80">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Theme and invite preview</p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">
                {plan?.theme ?? event.theme ?? `${event.event_type} celebration`}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
                {invite?.invite_copy ??
                  plan?.invite_copy ??
                  "Add invite copy to start shaping the voice of your event."}
              </p>
            </div>
            <Badge variant="success">{event.status}</Badge>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-[1.75rem] border border-dashed border-border bg-canvas p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Invite front</p>
              <p className="mt-6 text-3xl font-semibold text-ink">
                {event.title}
              </p>
              <p className="mt-3 text-sm leading-7 text-ink-muted">
                {invite?.invite_copy ??
                  "Your invite draft will appear here as soon as you save the messaging."}
              </p>
            </div>
            <div className="rounded-[1.75rem] bg-[#fffaf2] p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Recommended next actions</p>
              <div className="mt-4 space-y-3">
                {[
                  guests.length === 0
                    ? "Add your first guest so RSVP tracking can begin."
                    : `You have ${guests.length} guest${guests.length === 1 ? "" : "s"} connected to this event.`,
                  shoppingItems.length === 0
                    ? "Start the shopping list with your first item."
                    : `${shoppingItems.length} shopping item${shoppingItems.length === 1 ? "" : "s"} are already tracked.`,
                  tasks.length === 0
                    ? "Create a task so the event timeline can stay on schedule."
                    : `${tasks.filter((task) => task.status === "completed").length} task${tasks.filter((task) => task.status === "completed").length === 1 ? "" : "s"} completed so far.`,
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl bg-white/85 px-4 py-3">
                    <Sparkles className="mt-0.5 size-4 text-brand" />
                    <p className="text-sm leading-6 text-ink-muted">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="bg-[#fffaf2]">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Quick links</p>
          <div className="mt-4 grid gap-3">
            {[
              { href: `/events/${eventId}/invite`, label: "Invitation generator", detail: "Edit copy, manage sharing, and mark invitations sent." },
              { href: `/events/${eventId}/guests`, label: "Guest management", detail: "Add attendees, view RSVPs, and keep plus-ones current." },
              { href: `/events/${eventId}/shopping`, label: "Shopping cart", detail: "Track retailer, line items, and estimated spend." },
              { href: `/events/${eventId}/timeline`, label: "Timeline tracker", detail: "Create tasks and mark progress as the event approaches." },
              { href: `/events/${eventId}/settings`, label: "Security and settings", detail: "See live host profile information and privacy guidance." },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="rounded-3xl border border-border bg-white/85 p-4 transition hover:-translate-y-0.5">
                <p className="font-semibold text-ink">{item.label}</p>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{item.detail}</p>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Shopping list</p>
              <h3 className="mt-2 text-xl font-semibold text-ink">Live items connected to the database</h3>
            </div>
            <Link href={`/events/${eventId}/shopping`} className="text-sm font-medium text-brand hover:text-brand-dark">
              Open shopping
            </Link>
          </div>
          <div className="mt-5 grid gap-3">
            {shoppingItems.length ? (
              shoppingItems.slice(0, 4).map((item) => (
                <div key={item.id} className="grid gap-2 rounded-3xl border border-border bg-white/80 p-4 md:grid-cols-[0.6fr_1.2fr_0.6fr]">
                  <p className="text-sm font-medium text-ink-muted">{item.category}</p>
                  <p className="font-medium text-ink">{item.name}</p>
                  <label className="flex items-center justify-between gap-3 text-sm text-ink-muted">
                    <span>Qty {item.quantity}</span>
                    <input
                      type="checkbox"
                      checked={item.status === "purchased"}
                      readOnly
                      className="size-4 accent-[var(--brand)]"
                    />
                  </label>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-border bg-white/80 p-4 text-sm text-ink-muted">
                No shopping items yet. Add the first one on the shopping page.
              </div>
            )}
          </div>
        </Card>

        <div className="grid gap-4">
          <Card>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Task checklist</p>
            <div className="mt-4 space-y-3">
              {planTasks.length ? (
                planTasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-3 rounded-3xl border border-border bg-white/80 px-4 py-3">
                    <span className="mt-1 flex size-5 items-center justify-center rounded-full bg-accent-soft text-accent">
                      <Check className="size-3.5" />
                    </span>
                    <div>
                      <p className="text-sm leading-6 text-ink">{task.title}</p>
                      <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">
                        {task.status} {task.due_label ? `- ${task.due_label}` : ""}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-border bg-white/80 p-4 text-sm text-ink-muted">
                  No tasks yet. Create one from the timeline page.
                </div>
              )}
            </div>
          </Card>

          <Card>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Menu suggestions</p>
            <div className="mt-4 space-y-3">
              {menuIdeas.length ? (
                menuIdeas.map((item) => (
                  <div key={item} className="rounded-3xl bg-canvas px-4 py-3 text-sm text-ink">
                    {item}
                  </div>
                ))
              ) : (
                <div className="rounded-3xl bg-canvas px-4 py-3 text-sm text-ink-muted">
                  No menu suggestions stored yet.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Guest preview</p>
            <h3 className="mt-2 text-xl font-semibold text-ink">Current invitees</h3>
          </div>
          <Link href={`/events/${eventId}/guests`} className="text-sm font-medium text-brand hover:text-brand-dark">
            Manage guests
          </Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {previewGuests.length ? (
            previewGuests.map((guest) => (
              <div key={guest.id} className="rounded-3xl border border-border bg-white/80 p-4">
                <p className="font-medium text-ink">{guest.name}</p>
                <p className="mt-2 text-sm text-ink-muted">{guest.email ?? guest.phone ?? "No contact yet"}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-brand">{guest.status}</p>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-border bg-white/80 p-4 text-sm text-ink-muted md:col-span-3">
              No guests added yet. Add the first guest to start RSVP tracking.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
