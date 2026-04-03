import { AppShell } from "@/components/layout/app-shell";
import { EventWorkspaceOverview } from "@/components/events/event-workspace-overview";
import { getEventContext } from "@/lib/events";

export default async function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { event, invite, plan, guests, shoppingItems, tasks } = await getEventContext(eventId);

  return (
    <AppShell
      title={event.title}
      description={`A visual-first plan for ${event.event_type}, including invite preview, shopping, menu ideas, and checklist progress.`}
      backHref="/dashboard"
      backLabel="Back to dashboard"
      eventNav={{ eventId, eventTitle: event.title, active: "overview" }}
    >
      <EventWorkspaceOverview
        eventId={eventId}
        event={event}
        invite={invite}
        plan={plan}
        guests={guests}
        shoppingItems={shoppingItems}
        tasks={tasks}
      />
    </AppShell>
  );
}
