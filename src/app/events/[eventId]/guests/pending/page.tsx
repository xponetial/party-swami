import { EventGuestsWorkspace } from "@/components/guests/event-guests-workspace";

export default async function EventGuestsPendingPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  return <EventGuestsWorkspace eventId={eventId} section="pending" />;
}
