import { AppShell } from "@/components/layout/app-shell";
import { GuestListCard } from "@/components/guests/guest-list-card";
import { getEventContext } from "@/lib/events";

export default async function EventGuestsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { guests } = await getEventContext(eventId);

  return (
    <AppShell title="Guest management" description="Track guest status, add and import attendees, and keep RSVP communication organized.">
      <GuestListCard eventId={eventId} guests={guests} />
    </AppShell>
  );
}
