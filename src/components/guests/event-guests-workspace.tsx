import { AppShell } from "@/components/layout/app-shell";
import { GuestListCard, type GuestSection } from "@/components/guests/guest-list-card";
import { getEventContext } from "@/lib/events";

export async function EventGuestsWorkspace({
  eventId,
  section,
}: {
  eventId: string;
  section: GuestSection;
}) {
  const { event, guests, invite, guestMessages } = await getEventContext(eventId);

  const descriptions: Record<GuestSection, string> = {
    all: "See the full guest roster, manage RSVPs, and apply bulk updates without losing context.",
    add: "Add one guest at a time or import a full roster without the rest of the management clutter.",
    pending: "Focus only on the guests who still need to respond or be nudged forward.",
    accepted: "Review confirmed guests and seat impact without the rest of the roster mixed in.",
    declined: "Keep declined guests separate so your active roster stays cleaner.",
    activity: "Review invite delivery activity, RSVP movement, and outbound guest communication in one place.",
  };

  return (
    <AppShell
      title="Guest management"
      description={descriptions[section]}
      backHref={`/events/${eventId}`}
      eventNav={{ eventId, eventTitle: event.title, active: "guests" }}
    >
      <GuestListCard
        eventId={eventId}
        guestTarget={event.guest_target}
        guests={guests}
        invite={invite}
        guestMessages={guestMessages}
        section={section}
      />
    </AppShell>
  );
}
