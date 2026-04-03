import Link from "next/link";
import {
  ArrowRight,
  Check,
  ClipboardList,
  Mail,
  ShoppingBag,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import {
  type EventDetails,
  type GuestDetails,
  type InviteDetails,
  type PartyPlanDetails,
  type ShoppingItemDetails,
  type TaskDetails,
} from "@/lib/events";
import { AiRevisePlanForm } from "@/components/ai/ai-revise-plan-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type HubStep = {
  href: string;
  label: string;
  detail: string;
};

function getPrimaryStep({
  eventId,
  invite,
  guests,
  shoppingItems,
  tasks,
}: {
  eventId: string;
  invite: InviteDetails | null;
  guests: GuestDetails[];
  shoppingItems: ShoppingItemDetails[];
  tasks: TaskDetails[];
}): HubStep {
  if (!invite?.invite_copy?.trim()) {
    return {
      href: `/events/${eventId}/invite`,
      label: "Finish the invite",
      detail: "Tighten the wording and make sure the card looks ready to send.",
    };
  }

  if (guests.length === 0) {
    return {
      href: `/events/${eventId}/guests`,
      label: "Add your guests",
      detail: "Bring in attendees so RSVP tracking and invite delivery can begin.",
    };
  }

  if (shoppingItems.length === 0) {
    return {
      href: `/events/${eventId}/shopping`,
      label: "Review shopping recommendations",
      detail: "Turn the plan into a real item list with spend and retailer choices.",
    };
  }

  if (tasks.length === 0) {
    return {
      href: `/events/${eventId}/timeline`,
      label: "Build the timeline",
      detail: "Add tasks and timing so the event can move from planning into execution.",
    };
  }

  return {
    href: `/events/${eventId}/guests`,
    label: "Check guest delivery",
    detail: "See who has been invited, who has replied, and who still needs a nudge.",
  };
}

function formatSentState(invite: InviteDetails | null) {
  if (!invite?.sent_at) {
    return "Not sent yet";
  }

  return new Date(invite.sent_at).toLocaleString("en-US");
}

export function EventWorkspaceOverview({
  eventId,
  event,
  invite,
  plan,
  guests,
  shoppingItems,
  tasks,
}: EventWorkspaceOverviewProps) {
  const completedTasks = tasks.filter((task) => task.status === "completed").length;
  const pendingGuests = guests.filter((guest) => guest.status === "pending").length;
  const confirmedSeats = guests
    .filter((guest) => guest.status === "confirmed")
    .reduce((sum, guest) => sum + 1 + guest.plus_one_count, 0);
  const primaryStep = getPrimaryStep({ eventId, invite, guests, shoppingItems, tasks });
  const themeLabel = plan?.theme ?? event.theme ?? `${event.event_type} celebration`;
  const inviteSummary =
    invite?.invite_copy ??
    plan?.invite_copy ??
    "Shape the guest-facing voice of the event from the invitation generator.";

  const destinations = [
    {
      href: `/events/${eventId}/invite`,
      label: "Invitation generator",
      detail: "Edit the card, wording, and send-ready invite experience.",
      stat: invite?.sent_at ? "Invite delivered" : "Invite draft ready",
      icon: Mail,
    },
    {
      href: `/events/${eventId}/guests`,
      label: "Guest management",
      detail: "Add attendees, track RSVPs, and send invites or reminders.",
      stat: `${guests.length} guest${guests.length === 1 ? "" : "s"}`,
      icon: Users,
    },
    {
      href: `/events/${eventId}/shopping`,
      label: "Shopping recommendations",
      detail: "Review items, spend, and retailer choices from the plan.",
      stat: `${shoppingItems.length} item${shoppingItems.length === 1 ? "" : "s"}`,
      icon: ShoppingBag,
    },
    {
      href: `/events/${eventId}/timeline`,
      label: "Timeline and tasks",
      detail: "Turn the plan into a clear run-of-show with next actions.",
      stat: `${completedTasks}/${tasks.length || 0} completed`,
      icon: ClipboardList,
    },
  ];

  return (
    <div className="grid gap-4">
      <Card className="bg-white/85">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <Badge variant="success">{event.status}</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink">
              Run this event from one place
            </h2>
            <p className="mt-3 text-base leading-7 text-ink-muted">
              {themeLabel} is in motion. Use this hub to move through the event in order instead of
              bouncing between summary cards.
            </p>
            <div className="mt-5 rounded-[1.75rem] border border-border bg-[rgba(244,247,255,0.92)] p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Current invite direction</p>
              <p className="mt-3 text-sm leading-7 text-ink-muted">{inviteSummary}</p>
            </div>
          </div>

          <div className="w-full max-w-md rounded-[1.9rem] border border-white/80 bg-[linear-gradient(140deg,rgba(39,147,255,0.92)_0%,rgba(118,97,255,0.9)_48%,rgba(187,119,255,0.86)_100%)] p-5 text-white shadow-party">
            <p className="text-xs uppercase tracking-[0.22em] text-white/70">Next best step</p>
            <h3 className="mt-3 text-2xl font-semibold">{primaryStep.label}</h3>
            <p className="mt-3 text-sm leading-6 text-white/85">{primaryStep.detail}</p>
            <Button asChild className="mt-5 w-full bg-white text-ink hover:bg-white/90">
              <Link href={primaryStep.href}>
                Continue
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Invite status",
            value: formatSentState(invite),
            detail: invite?.sent_at ? "Last invite delivery" : "Ready when you are",
          },
          {
            label: "Guest list",
            value: String(guests.length),
            detail: pendingGuests
              ? `${pendingGuests} pending RSVP${pendingGuests === 1 ? "" : "s"}`
              : "No pending RSVPs",
          },
          {
            label: "Confirmed seats",
            value: String(confirmedSeats),
            detail: "Guests plus confirmed plus-ones",
          },
          {
            label: "Task progress",
            value: `${completedTasks}/${tasks.length || 0}`,
            detail: tasks.length ? "Checklist items completed" : "No tasks yet",
          },
        ].map((item) => (
          <Card key={item.label} className="bg-white/80">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold text-ink">{item.value}</p>
            <p className="mt-2 text-sm leading-6 text-ink-muted">{item.detail}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <Card className="bg-[rgba(244,247,255,0.9)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Event path</p>
              <h3 className="mt-2 text-2xl font-semibold text-ink">Go where the work actually happens</h3>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {destinations.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-[1.75rem] border border-border bg-white/85 p-5 transition hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="rounded-2xl bg-canvas p-3 text-brand">
                    <item.icon className="size-5" />
                  </div>
                  <span className="text-xs uppercase tracking-[0.18em] text-ink-muted">
                    {item.stat}
                  </span>
                </div>
                <p className="mt-4 text-lg font-semibold text-ink">{item.label}</p>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{item.detail}</p>
              </Link>
            ))}
          </div>
        </Card>

        <div className="grid gap-4">
          <Card className="bg-white/80">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Snapshot</p>
            <div className="mt-4 space-y-3">
              {[
                guests.length === 0
                  ? "No guests yet. Start by importing or adding your first attendees."
                  : `${guests.length} guest${guests.length === 1 ? "" : "s"} are already connected to this event.`,
                shoppingItems.length === 0
                  ? "Shopping recommendations still need a review."
                  : `${shoppingItems.length} shopping item${shoppingItems.length === 1 ? "" : "s"} are already tracked.`,
                tasks.length === 0
                  ? "No run-of-show tasks are stored yet."
                  : `${completedTasks} task${completedTasks === 1 ? "" : "s"} are already complete.`,
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl bg-canvas px-4 py-3">
                  <Sparkles className="mt-0.5 size-4 text-brand" />
                  <p className="text-sm leading-6 text-ink-muted">{item}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-white/80">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Recent task focus</p>
            <div className="mt-4 space-y-3">
              {tasks.slice(0, 4).length ? (
                tasks.slice(0, 4).map((task) => (
                  <div key={task.id} className="flex items-start gap-3 rounded-2xl border border-border bg-white/85 px-4 py-3">
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
                <div className="rounded-2xl bg-canvas px-4 py-3 text-sm leading-6 text-ink-muted">
                  No tasks yet. The timeline page is the best next place to structure the run-of-show.
                </div>
              )}
            </div>
          </Card>

          <Card className="bg-[rgba(244,247,255,0.92)]">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">AI revision</p>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Need a sharper pivot? Keep the event structure, but ask AI Party Genie to revise one specific part.
            </p>
            <div className="mt-4">
              <AiRevisePlanForm eventId={eventId} />
            </div>
          </Card>
        </div>
      </div>

      <Card className="bg-white/80">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Need something specific?</p>
            <h3 className="mt-2 text-xl font-semibold text-ink">A few supporting destinations still live here</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary">
              <Link href={`/events/${eventId}/settings`}>
                <Shield className="size-4" />
                Settings
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/events/${eventId}/timeline`}>
                <ClipboardList className="size-4" />
                Timeline
              </Link>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
