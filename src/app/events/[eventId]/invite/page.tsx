import { AppShell } from "@/components/layout/app-shell";
import { InvitePreviewCard } from "@/components/invite/invite-preview-card";
import { getEventContext } from "@/lib/events";

export default async function EventInvitePage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { event, invite, guests, guestMessages } = await getEventContext(eventId);

  return (
    <AppShell
      title="Invitation generator"
      description="Invite editing, guest messaging, RSVP tracking, and reminder controls in one place."
      backHref={`/events/${eventId}`}
    >
      <InvitePreviewCard event={event} invite={invite} guests={guests} guestMessages={guestMessages} />
    </AppShell>
  );
}
