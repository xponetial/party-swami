import { AppShell } from "@/components/layout/app-shell";
import { EventFormCard } from "@/components/events/event-form-card";
import { getInviteTemplateCatalog } from "@/lib/invite-template-catalog";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const categories = await getInviteTemplateCatalog();

  return (
    <AppShell
      currentSection="/events/new"
      title="Create event"
      description="Choose the kind of event first, then shape the vibe, date, guest count, and budget around the card family you want to lead with."
    >
      <EventFormCard categories={categories} error={error} />
    </AppShell>
  );
}
