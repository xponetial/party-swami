"use client";

import { CalendarDays, MapPin, Sparkles, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { createEventAction } from "@/app/events/actions";
import { InviteCardCanvas } from "@/components/invite/invite-card-canvas";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import type { InviteDesignData } from "@/lib/invite-design";
import type { InviteTemplateCategory } from "@/lib/invite-template-types";

const THEME_SUGGESTIONS: Record<string, string[]> = {
  anniversary: ["Golden candlelit dinner", "Garden vows and champagne", "Modern black-tie romance"],
  "baby-shower": ["Soft pastel brunch", "Storybook nursery tea", "Clouds and confetti afternoon"],
  birthday: ["Color-pop rooftop party", "Poolside birthday bash", "Disco cake celebration"],
  "bridal-shower": ["Champagne garden party", "Pearls and prosecco brunch", "Modern floral tea"],
  christmas: ["Cozy candlelit supper", "Classic red-and-gold gathering", "Snowy sweater cocktail night"],
  diwali: ["Lantern-lit dinner", "Gold and marigold celebration", "Family sweets and sparkle night"],
  easter: ["Pastel garden brunch", "Spring picnic lunch", "Floral egg hunt afternoon"],
  eid: ["Moonlit dinner gathering", "Elegant family feast", "Gold and emerald dessert night"],
  "fathers-day": ["Backyard grill afternoon", "Whiskey and steak dinner", "Classic sports watch party"],
  graduation: ["School-color celebration", "Cap and confetti dinner", "Open house dessert table"],
  halloween: ["Moody costume party", "Pumpkin porch gathering", "Haunted cocktail evening"],
  hanukkah: ["Blue-and-gold dinner", "Latke and candle night", "Cozy family celebration"],
  housewarming: ["Warm modern open house", "Wine and welcome bites", "Neighborhood mingle night"],
  "4th-of-july": ["Patio fireworks watch", "Classic Americana cookout", "Stars and sparklers party"],
  "new-year": ["Midnight champagne party", "Black-and-gold countdown", "Disco ball celebration"],
  "pool-party": ["Sunset swim party", "Tropical float day", "Cabana birthday splash"],
  "st-patrick-s-day": ["Emerald cocktail night", "Pub-style dinner party", "Lucky brunch gathering"],
  sympathy: ["Quiet remembrance gathering", "Soft candlelit memorial", "Garden reflection reception"],
  thanksgiving: ["Harvest dinner", "Friendsgiving supper", "Rustic family feast"],
  "valentine-s-day": ["Rose-gold dinner date", "Sweetheart brunch", "Candlelit dessert party"],
  wedding: ["Elegant evening reception", "Garden ceremony weekend", "Classic black-tie celebration"],
};

function createDefaultTitle(categoryLabel: string) {
  switch (categoryLabel) {
    case "Birthday":
      return "Ava's Birthday Party";
    case "Wedding":
      return "Jordan and Taylor's Wedding";
    case "Baby Shower":
      return "Welcome Baby Harper";
    case "Graduation":
      return "Maya's Graduation Party";
    case "4th of July":
      return "Fourth of July Cookout";
    default:
      return `${categoryLabel} Celebration`;
  }
}

function buildPreviewDesign({
  category,
  title,
  theme,
  date,
  time,
  location,
}: {
  category: InviteTemplateCategory;
  title: string;
  theme: string;
  date: string;
  time: string;
  location: string;
}): InviteDesignData {
  const template = category.templates[0];
  const formattedDate = date
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "full",
        timeStyle: time ? "short" : undefined,
      }).format(new Date(time ? `${date}T${time}:00` : `${date}T12:00:00`))
    : "Choose a date";

  return {
    templateId: template.templateId,
    packSlug: template.packSlug,
    categoryKey: category.key,
    categoryLabel: category.label,
    fields: {
      title: title.trim() || createDefaultTitle(category.label),
      subtitle: theme.trim() || category.label,
      dateText: formattedDate,
      locationText: location.trim() || "Add the party location",
      messageText: `A polished invitation and starter party plan will be generated for your ${category.label.toLowerCase()} event.`,
      ctaText: "Create this event",
    },
  };
}

export function EventFormCard({
  categories,
  error,
}: {
  categories: InviteTemplateCategory[];
  error?: string;
}) {
  const initialCategory =
    categories.find((category) => category.key === "birthday") ?? categories[0];

  const [selectedCategoryKey, setSelectedCategoryKey] = useState(initialCategory.key);
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");

  const selectedCategory =
    categories.find((category) => category.key === selectedCategoryKey) ?? initialCategory;
  const themeSuggestions = THEME_SUGGESTIONS[selectedCategory.key] ?? [
    `${selectedCategory.label} celebration`,
    `Modern ${selectedCategory.label.toLowerCase()} party`,
    `${selectedCategory.label} with signature details`,
  ];

  const previewDesign = useMemo(
    () =>
      buildPreviewDesign({
        category: selectedCategory,
        title,
        theme,
        date,
        time,
        location,
      }),
    [date, location, selectedCategory, theme, time, title],
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge>Occasion-first setup</Badge>
            <h2 className="mt-4 text-2xl font-semibold text-ink">Start with the kind of event you are hosting</h2>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Pick an occasion family first, then fill in a few details. Party Swami will use that
              direction to create the workspace, starter plan, and matching invite experience.
            </p>
          </div>
          <div className="rounded-full bg-canvas px-4 py-2 text-sm text-ink-muted">
            {categories.length} template families ready
          </div>
        </div>

        <form action={createEventAction} className="mt-6">
          <input type="hidden" name="eventType" value={selectedCategory.label} />
          <input type="hidden" name="designJson" value={JSON.stringify(previewDesign)} />

          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Choose occasion</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {categories.map((category) => {
                const leadTemplate = category.templates[0];
                const active = category.key === selectedCategory.key;

                return (
                  <button
                    key={category.key}
                    className={`overflow-hidden rounded-[1.6rem] border text-left transition ${
                      active
                        ? "border-brand bg-brand/5 shadow-party"
                        : "border-border bg-white hover:border-brand/30"
                    }`}
                    onClick={() => setSelectedCategoryKey(category.key)}
                    type="button"
                  >
                    <div
                      className="relative h-36 w-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${leadTemplate.assetPath})` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-8 text-white">
                        <p className="text-sm font-semibold">{category.label}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/75">
                          {category.templates.length} designs
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Event title</Label>
              <Input
                id="title"
                name="title"
                onChange={(event) => setTitle(event.target.value)}
                placeholder={createDefaultTitle(selectedCategory.label)}
                required
                value={title}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest-target">Guest count</Label>
              <Input id="guest-target" name="guestTarget" min="0" placeholder="24" type="number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget">Budget</Label>
              <Input id="budget" name="budget" min="0" placeholder="450" step="0.01" type="number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-date">Date</Label>
              <Input
                id="event-date"
                name="eventDate"
                onChange={(event) => setDate(event.target.value)}
                type="date"
                value={date}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-time">Time</Label>
              <Input
                id="event-time"
                name="eventTime"
                onChange={(event) => setTime(event.target.value)}
                type="time"
                value={time}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Austin, TX"
                value={location}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="theme">Vibe or theme direction</Label>
              <Input
                id="theme"
                name="theme"
                onChange={(event) => setTheme(event.target.value)}
                placeholder={themeSuggestions[0]}
                value={theme}
              />
            </div>
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl border border-brand/20 bg-brand/10 px-4 py-3 text-sm text-brand">
              {error}
            </p>
          ) : null}

          <div className="mt-6 rounded-[1.75rem] bg-canvas p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-brand" />
              <p className="text-sm font-medium text-ink">Suggested vibes for {selectedCategory.label}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {themeSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  className="rounded-full border border-border bg-white px-4 py-2 text-sm text-ink-muted transition hover:border-brand/30 hover:text-ink"
                  onClick={() => setTheme(suggestion)}
                  type="button"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <SubmitButton className="mt-6 w-full" pendingLabel="Creating event...">
            Create {selectedCategory.label} event
          </SubmitButton>
        </form>
      </Card>

      <div className="space-y-4">
        <Card className="bg-[rgba(244,247,255,0.9)]">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Live invitation direction</p>
          <h3 className="mt-3 text-2xl font-semibold text-ink">
            Your event setup now starts from the card family
          </h3>
          <div className="mt-5">
            <InviteCardCanvas
              alt={`${selectedCategory.label} setup preview`}
              design={previewDesign}
              maxWidth={390}
              template={selectedCategory.templates[0]}
            />
          </div>
        </Card>

        <Card className="bg-white">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">What gets created</p>
          <div className="mt-5 grid gap-3">
            {[
              {
                icon: Sparkles,
                title: "Occasion-matched invite design",
                copy: "The invite page starts in the same template family you selected here.",
              },
              {
                icon: Users,
                title: "Workspace and planning rows",
                copy: "Your event, checklist, shopping list, and starter plan are created in one save.",
              },
              {
                icon: CalendarDays,
                title: "Date-aware hosting timeline",
                copy: "The event workspace loads with timing, planning, and RSVP structure already in place.",
              },
              {
                icon: MapPin,
                title: "Location-ready event details",
                copy: "Address and theme flow through to the invite, dashboard, and guest messaging screens.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-border bg-[rgba(237,243,255,0.92)] p-4"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="size-4 text-brand" />
                  <p className="font-semibold text-ink">{item.title}</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{item.copy}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
