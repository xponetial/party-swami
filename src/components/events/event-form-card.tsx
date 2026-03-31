import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const themes = [
  "Citrus rooftop brunch",
  "Pastel picnic birthday",
  "Moody dinner party",
  "Modern taco night",
];

export function EventFormCard() {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-ink">Event setup</h2>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Keep the inputs light, then let PartyGenie generate a draft plan with invite, menu, shopping, and tasks.
            </p>
          </div>
          <Badge>AI input screen</Badge>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">Event title</Label>
            <Input id="title" placeholder="Ava's Garden Birthday" disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-type">Event type</Label>
            <Input id="event-type" placeholder="Birthday party" disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guest-target">Guest count</Label>
            <Input id="guest-target" placeholder="24 guests" disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-date">Date</Label>
            <Input id="event-date" placeholder="2026-06-13" disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-time">Time</Label>
            <Input id="event-time" placeholder="2:00 PM" disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget">Budget</Label>
            <Input id="budget" placeholder="$450 optional" disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Input id="theme" placeholder="Garden brunch optional" disabled />
          </div>
        </div>

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

        <button
          type="button"
          disabled
          className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-brand px-5 py-3 text-sm font-medium text-white opacity-80"
        >
          Generate my party plan
        </button>
      </Card>

      <Card className="bg-[#fffaf2]">
        <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Preview of AI output</p>
        <h3 className="mt-3 text-2xl font-semibold text-ink">What gets generated from this brief</h3>
        <div className="mt-6 grid gap-3">
          {[
            "A theme direction with editable invite preview and message copy",
            "A shopping list organized by category, quantity, and estimated spend",
            "An auto-generated task checklist with deadlines and reminders",
            "Menu suggestions that feed ingredients back into the cart",
          ].map((item) => (
            <div key={item} className="rounded-3xl border border-border bg-white/85 p-4 text-sm leading-6 text-ink-muted">
              {item}
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-[1.75rem] bg-brand px-5 py-5 text-white">
          <p className="text-sm uppercase tracking-[0.2em] text-white/70">Performance target</p>
          <p className="mt-2 text-lg font-semibold">Every screen in the flow should feel ready in under two seconds.</p>
        </div>
      </Card>
    </div>
  );
}
