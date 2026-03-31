import { AppShell } from "@/components/layout/app-shell";
import { EventFormCard } from "@/components/events/event-form-card";

export default function NewEventPage() {
  return (
    <AppShell
      title="Create event"
      description="The guided AI input screen for event type, guest count, timing, budget, and optional theme direction."
    >
      <EventFormCard />
    </AppShell>
  );
}
