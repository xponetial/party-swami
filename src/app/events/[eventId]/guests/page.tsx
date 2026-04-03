import { AppShell } from "@/components/layout/app-shell";
import { GuestListCard } from "@/components/guests/guest-list-card";
import { getEventContext } from "@/lib/events";

export default async function EventGuestsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { event, guests, invite, guestMessages } = await getEventContext(eventId);

  return (
    <AppShell
      title="Guest management"
      description="Track guest status, add and import attendees, and keep RSVP communication organized."
      backHref={`/events/${eventId}`}
      eventNav={{ eventId, eventTitle: event.title, active: "guests" }}
    >
      <GuestListCard eventId={eventId} guests={guests} invite={invite} guestMessages={guestMessages} />
    </AppShell>
  );
}
