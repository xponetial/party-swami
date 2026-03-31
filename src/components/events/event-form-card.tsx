import { Sparkles } from "lucide-react";
import { createEventAction } from "@/app/events/actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";

const themes = [
  "Citrus rooftop brunch",
  "Pastel picnic birthday",
  "Moody dinner party",
  "Modern taco night",
];

export function EventFormCard({ error }: { error?: string }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-ink">Event setup</h2>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Keep the inputs light, then let PartyGenie create the event, starter plan, invite,
              shopping list, and first checklist rows in Supabase.
            </p>
          </div>
          <Badge>AI input screen</Badge>
        </div>

        <form action={createEventAction} className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Event title</Label>
              <Input id="title" name="title" placeholder="Ava's Garden Birthday" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-type">Event type</Label>
              <Input id="event-type" name="eventType" placeholder="Birthday party" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest-target">Guest count</Label>
              <Input id="guest-target" name="guestTarget" type="number" min="0" placeholder="24" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-date">Date</Label>
              <Input id="event-date" name="eventDate" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-time">Time</Label>
              <Input id="event-time" name="eventTime" type="time" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget">Budget</Label>
              <Input id="budget" name="budget" type="number" min="0" step="0.01" placeholder="450" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Input id="theme" name="theme" placeholder="Garden brunch optional" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" placeholder="Austin, TX" />
            </div>
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl border border-[#e7c2b7] bg-[#fff5f1] px-4 py-3 text-sm text-brand">
              {error}
            </p>
          ) : null}

          <div className="mt-6 rounded-[1.75rem] bg-canvas p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-brand" />
              <p className="text-sm font-medium text-ink">Suggested themes</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {themes.map((theme) => (
                <span
                  key={theme}
                  className="rounded-full border border-border bg-white px-4 py-2 text-sm text-ink-muted"
                >
                  {theme}
                </span>
              ))}
            </div>
          </div>

          <SubmitButton className="mt-6 w-full" pendingLabel="Creating event...">
            Generate my party plan
          </SubmitButton>
        </form>
      </Card>

      <Card className="bg-[#fffaf2]">
        <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Preview of AI output</p>
        <h3 className="mt-3 text-2xl font-semibold text-ink">What gets generated from this brief</h3>
        <div className="mt-6 grid gap-3">
          {[
            "An event row owned by the current Supabase user",
            "A starter invite draft with a shareable public slug",
            "A shopping list and first checklist/timeline rows",
            "A seed party plan so every event route has live data to render",
          ].map((item) => (
            <div
              key={item}
              className="rounded-3xl border border-border bg-white/85 p-4 text-sm leading-6 text-ink-muted"
            >
              {item}
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-[1.75rem] bg-brand px-5 py-5 text-white">
          <p className="text-sm uppercase tracking-[0.2em] text-white/70">Performance target</p>
          <p className="mt-2 text-lg font-semibold">
            Create, redirect, and load the event workspace with real database content.
          </p>
        </div>
      </Card>
    </div>
  );
}
