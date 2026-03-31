import { AppShell } from "@/components/layout/app-shell";
import { InvitePreviewCard } from "@/components/invite/invite-preview-card";

export default function EventInvitePage() {
  return (
    <AppShell title="Invitation generator" description="Invite editing, guest messaging, RSVP tracking, and reminder controls in one place.">
      <InvitePreviewCard />
    </AppShell>
  );
}
