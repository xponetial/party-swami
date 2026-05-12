import { updateEventDetailsAction } from "@/app/events/actions";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function toDateInputValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function toTimeInputValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(11, 16);
}

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams?: Promise<{ error?: string; success?: string }>;
}) {
  const { eventId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const supabase = await createSupabaseServerClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, title, event_type, event_date, location, guest_target, budget, theme")
    .eq("id", eventId)
    .maybeSingle<{
      id: string;
      title: string;
      event_type: string;
      event_date: string | null;
      location: string | null;
      guest_target: number | null;
      budget: number | null;
      theme: string | null;
    }>();

  if (!event) {
    return null;
  }

  return (
    <AppShell
      title="Edit event details"
      description="Update core event details so planning, invites, shopping, and vendor recommendations stay accurate."
      backHref={`/events/${eventId}`}
      eventNav={{ eventId, eventTitle: event.title, active: "edit" }}
    >
      <Card>
        <h2 className="text-xl font-semibold text-ink">Event setup</h2>
        {resolvedSearchParams.error ? (
          <p className="mt-4 rounded-2xl border border-brand/20 bg-brand/10 px-4 py-3 text-sm text-brand">
            {resolvedSearchParams.error}
          </p>
        ) : null}
        {resolvedSearchParams.success ? (
          <p className="mt-4 rounded-2xl border border-accent/20 bg-accent-soft px-4 py-3 text-sm text-accent">
            Event details updated.
          </p>
        ) : null}
        <form action={updateEventDetailsAction} className="mt-5 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="eventId" value={eventId} />
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="title">Event title</Label>
            <Input id="title" name="title" defaultValue={event.title} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eventType">Event type</Label>
            <Input id="eventType" name="eventType" defaultValue={event.event_type} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Input id="theme" name="theme" defaultValue={event.theme ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eventDate">Date</Label>
            <Input id="eventDate" name="eventDate" type="date" defaultValue={toDateInputValue(event.event_date)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eventTime">Time</Label>
            <Input id="eventTime" name="eventTime" type="time" defaultValue={toTimeInputValue(event.event_date)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" name="location" defaultValue={event.location ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guestTarget">Guest target</Label>
            <Input id="guestTarget" name="guestTarget" type="number" min={0} defaultValue={event.guest_target ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget">Budget</Label>
            <Input id="budget" name="budget" type="number" min={0} step="1" defaultValue={event.budget ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <SubmitButton pendingLabel="Saving details..." variant="secondary">
              Save event details
            </SubmitButton>
          </div>
        </form>
      </Card>
    </AppShell>
  );
}
