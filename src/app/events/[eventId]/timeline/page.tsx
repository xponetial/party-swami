import { AppShell } from "@/components/layout/app-shell";
import { TaskTimelineCard } from "@/components/tasks/task-timeline-card";
import { getEventContext } from "@/lib/events";

export default async function EventTimelinePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { event, tasks, timelineItems } = await getEventContext(eventId);

  return (
    <AppShell
      title="Timeline and tasks"
      description="Track pre-event prep, event-week readiness, and a clean day-of timeline with reminders."
      backHref={`/events/${eventId}`}
      eventNav={{ eventId, eventTitle: event.title, active: "timeline" }}
    >
      <TaskTimelineCard eventId={eventId} tasks={tasks} timelineItems={timelineItems} />
    </AppShell>
  );
}
