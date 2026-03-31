import { AppShell } from "@/components/layout/app-shell";
import { TaskTimelineCard } from "@/components/tasks/task-timeline-card";

export default function EventTimelinePage() {
  return (
    <AppShell title="Timeline and tasks" description="Track pre-event prep, event-week readiness, and a clean day-of timeline with reminders.">
      <TaskTimelineCard />
    </AppShell>
  );
}
