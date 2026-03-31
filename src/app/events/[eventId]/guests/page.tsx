import { AppShell } from "@/components/layout/app-shell";
import { GuestListCard } from "@/components/guests/guest-list-card";

export default function EventGuestsPage() {
  return (
    <AppShell title="Guest management" description="Track guest status, add and import attendees, and keep RSVP communication organized.">
      <GuestListCard />
    </AppShell>
  );
}
