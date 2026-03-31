import { AppShell } from "@/components/layout/app-shell";
import { EventWorkspaceOverview } from "@/components/events/event-workspace-overview";

export default async function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <AppShell
      title="AI party plan dashboard"
      description={`A visual-first plan for event ${eventId}, including theme, invite preview, shopping, menu ideas, and checklist progress.`}
    >
      <EventWorkspaceOverview eventId={eventId} />
    </AppShell>
  );
}
