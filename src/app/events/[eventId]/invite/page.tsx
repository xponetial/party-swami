import { AppShell } from "@/components/layout/app-shell";
import { InvitePreviewCard } from "@/components/invite/invite-preview-card";
import { getEventContext } from "@/lib/events";
import { getInviteTemplateCatalog } from "@/lib/invite-template-catalog";

export default async function EventInvitePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const [{ event, invite }, templateCategories] = await Promise.all([
    getEventContext(eventId),
    getInviteTemplateCatalog(),
  ]);

  return (
    <AppShell
      title="Invitation generator"
      description="Invite editing, guest messaging, RSVP tracking, and reminder controls in one place."
      backHref={`/events/${eventId}`}
      eventNav={{ eventId, eventTitle: event.title, active: "invite" }}
    >
      <InvitePreviewCard
        event={event}
        invite={invite}
        templateCategories={templateCategories}
      />
    </AppShell>
  );
}
