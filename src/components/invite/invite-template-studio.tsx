"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { saveInviteAction } from "@/app/events/actions";
import { AiGenerateButton } from "@/components/ai/ai-generate-button";
import { InviteCardCanvas } from "@/components/invite/invite-card-canvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  normalizeInviteDesignData,
  type InviteDesignData,
} from "@/lib/invite-design";
import type { EventDetails, InviteDetails } from "@/lib/events";
import {
  findInviteTemplate,
  type InviteTemplateCategory,
} from "@/lib/invite-template-types";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferCategoryKey(eventType: string, categories: InviteTemplateCategory[]) {
  const normalized = slugify(eventType);
  return (
    categories.find((category) => normalized.includes(category.key))?.key ??
    categories.find((category) => category.key.includes(normalized))?.key ??
    categories[0]?.key ??
    ""
  );
}

function formatDateText(value: string | null) {
  if (!value) return "Date coming soon";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}

function buildDefaultDesign(
  event: EventDetails,
  invite: InviteDetails,
  categories: InviteTemplateCategory[],
): InviteDesignData {
  const categoryKey = inferCategoryKey(event.event_type, categories);
  const template =
    categories.find((category) => category.key === categoryKey)?.templates[0] ??
    categories[0].templates[0];

  const fallback: InviteDesignData = {
    templateId: template.templateId,
    packSlug: template.packSlug,
    categoryKey: template.categoryKey,
    categoryLabel: template.categoryLabel,
    fields: {
      title: event.title,
      subtitle: event.theme?.trim() || event.event_type,
      dateText: formatDateText(event.event_date),
      locationText: event.location?.trim() || "Location coming soon",
      messageText: invite.invite_copy ?? `Join us for ${event.title}.`,
      ctaText: "RSVP with your private link",
    },
  };

  return invite.design_json
    ? normalizeInviteDesignData(invite.design_json, fallback)
    : fallback;
}

export function InviteTemplateStudio({
  categories,
  event,
  invite,
}: {
  categories: InviteTemplateCategory[];
  event: EventDetails;
  invite: InviteDetails;
}) {
  const initialDesign = useMemo(
    () => buildDefaultDesign(event, invite, categories),
    [categories, event, invite],
  );
  const [design, setDesign] = useState<InviteDesignData>(initialDesign);

  const selectedCategory =
    categories.find((category) => category.key === design.categoryKey) ?? categories[0];
  const selectedTemplate =
    findInviteTemplate(categories, {
      templateId: design.templateId,
      packSlug: design.packSlug,
    }) ?? selectedCategory.templates[0];

  const nextDesignJson = JSON.stringify(design);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-border bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Badge>Evite-style invitation studio</Badge>
              <h2 className="mt-4 text-3xl font-semibold text-ink">Choose a template family</h2>
              <p className="mt-3 text-sm leading-7 text-ink-muted">
                Browse by holiday or life event, then pick a card design that feels right for this
                invite.
              </p>
            </div>
            <AiGenerateButton
              endpoint="/api/ai/generate-invite-copy"
              eventId={event.id}
              label="Refresh wording with AI"
              pendingLabel="Refreshing wording..."
              variant="ghost"
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {categories.map((category) => (
              <button
                key={category.key}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  category.key === selectedCategory.key
                    ? "border-brand bg-brand/10 text-ink"
                    : "border-border bg-white text-ink-muted hover:border-brand/30 hover:text-ink"
                }`}
                onClick={() =>
                  setDesign((current) => {
                    const nextTemplate = category.templates[0];
                    return {
                      ...current,
                      templateId: nextTemplate.templateId,
                      packSlug: nextTemplate.packSlug,
                      categoryKey: category.key,
                      categoryLabel: category.label,
                    };
                  })
                }
                type="button"
              >
                {category.label}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {selectedCategory.templates.map((template) => (
              <button
                key={`${template.packSlug}:${template.templateId}`}
                className={`overflow-hidden rounded-[1.5rem] border text-left transition ${
                  template.templateId === selectedTemplate.templateId &&
                  template.packSlug === selectedTemplate.packSlug
                    ? "border-brand bg-brand/5 shadow-party"
                    : "border-border bg-white hover:border-brand/30"
                }`}
                onClick={() =>
                  setDesign((current) => ({
                    ...current,
                    templateId: template.templateId,
                    packSlug: template.packSlug,
                    categoryKey: template.categoryKey,
                    categoryLabel: template.categoryLabel,
                  }))
                }
                type="button"
              >
                <div
                  className="h-44 w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${template.assetPath})` }}
                />
                <div className="space-y-2 px-4 py-4">
                  <p className="text-sm font-semibold text-ink">{template.style}</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">
                    {template.packLabel}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <form action={saveInviteAction} className="rounded-[2rem] border border-border bg-white p-6">
          <input type="hidden" name="eventId" value={event.id} />
          <input type="hidden" name="inviteId" value={invite.id} />
          <input type="hidden" name="inviteCopy" value={design.fields.messageText} />
          <input type="hidden" name="designJson" value={nextDesignJson} />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Card copy</p>
              <h3 className="mt-2 text-xl font-semibold text-ink">Edit the invitation details</h3>
            </div>
            <p className="rounded-2xl border border-border bg-[rgba(237,243,255,0.92)] px-4 py-3 text-sm text-ink">
              RSVP links are live automatically for guest invites.
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <Label htmlFor="card-title">Card title</Label>
              <input
                id="card-title"
                className="w-full rounded-2xl border border-border bg-[rgba(237,243,255,0.92)] px-4 py-3 text-sm text-ink outline-none transition focus:border-brand/50 focus:ring-4 focus:ring-brand/10"
                onChange={(eventValue) =>
                  setDesign((current) => ({
                    ...current,
                    fields: { ...current.fields, title: eventValue.target.value },
                  }))
                }
                value={design.fields.title}
              />
            </label>
            <label className="space-y-2">
              <Label htmlFor="card-subtitle">Eyebrow</Label>
              <input
                id="card-subtitle"
                className="w-full rounded-2xl border border-border bg-[rgba(237,243,255,0.92)] px-4 py-3 text-sm text-ink outline-none transition focus:border-brand/50 focus:ring-4 focus:ring-brand/10"
                onChange={(eventValue) =>
                  setDesign((current) => ({
                    ...current,
                    fields: { ...current.fields, subtitle: eventValue.target.value },
                  }))
                }
                value={design.fields.subtitle}
              />
            </label>
            <label className="space-y-2">
              <Label htmlFor="card-date">Date and time</Label>
              <input
                id="card-date"
                className="w-full rounded-2xl border border-border bg-[rgba(237,243,255,0.92)] px-4 py-3 text-sm text-ink outline-none transition focus:border-brand/50 focus:ring-4 focus:ring-brand/10"
                onChange={(eventValue) =>
                  setDesign((current) => ({
                    ...current,
                    fields: { ...current.fields, dateText: eventValue.target.value },
                  }))
                }
                value={design.fields.dateText}
              />
            </label>
            <label className="space-y-2">
              <Label htmlFor="card-location">Location</Label>
              <input
                id="card-location"
                className="w-full rounded-2xl border border-border bg-[rgba(237,243,255,0.92)] px-4 py-3 text-sm text-ink outline-none transition focus:border-brand/50 focus:ring-4 focus:ring-brand/10"
                onChange={(eventValue) =>
                  setDesign((current) => ({
                    ...current,
                    fields: { ...current.fields, locationText: eventValue.target.value },
                  }))
                }
                value={design.fields.locationText}
              />
            </label>
          </div>

          <div className="mt-4 space-y-4">
            <label className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Label htmlFor="card-message">Message to guests</Label>
                <AiGenerateButton
                  endpoint="/api/ai/generate-invite-copy"
                  eventId={event.id}
                  label="Rewrite with AI"
                  pendingLabel="Rewriting..."
                  variant="secondary"
                />
              </div>
              <textarea
                id="card-message"
                className="min-h-32 w-full rounded-[1.5rem] border border-border bg-[rgba(237,243,255,0.92)] p-4 text-sm leading-7 text-ink-muted outline-none transition focus:border-brand/50 focus:ring-4 focus:ring-brand/10"
                minLength={10}
                onChange={(eventValue) =>
                  setDesign((current) => ({
                    ...current,
                    fields: { ...current.fields, messageText: eventValue.target.value },
                  }))
                }
                value={design.fields.messageText}
              />
            </label>
            <div className="rounded-[1.5rem] border border-border bg-[rgba(237,243,255,0.92)] px-4 py-3 text-sm text-ink-muted">
              RSVP call-to-action text is fixed automatically for guests.
            </div>
          </div>

          <div className="mt-5">
            <SubmitButton pendingLabel="Saving invitation..." variant="secondary">
              Save invitation design
            </SubmitButton>
          </div>

          <div className="mt-4 rounded-[1.5rem] border border-border bg-[rgba(244,247,255,0.9)] p-4">
            <p className="text-sm leading-6 text-ink-muted">
              Once the card looks right, move into guest management to add recipients, review RSVP
              status, and send the invite.
            </p>
            <Button asChild className="mt-3">
              <Link href={`/events/${event.id}/guests`}>Next: Guest management</Link>
            </Button>
          </div>
        </form>
      </div>

      <div className="space-y-6">
        <div className="rounded-[2rem] border border-border bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Live preview</p>
              <h3 className="mt-2 text-xl font-semibold text-ink">
                {selectedTemplate.style} | {selectedTemplate.packLabel}
              </h3>
            </div>
            <Badge>{selectedCategory.label}</Badge>
          </div>
          <div className="mt-5">
            <InviteCardCanvas
              alt={`${selectedTemplate.style} invitation preview`}
              design={design}
              template={selectedTemplate}
            />
          </div>
        </div>

        <div className="rounded-[2rem] border border-border bg-[rgba(244,247,255,0.9)] p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Full guest message</p>
          <div className="mt-3 rounded-[1.5rem] border border-border bg-white/80 p-5">
            <p className="whitespace-pre-wrap text-sm leading-7 text-ink-muted">
              {design.fields.messageText}
            </p>
          </div>
        </div>

        <div className="rounded-[2rem] border border-border bg-[rgba(244,247,255,0.9)] p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Saved behavior</p>
          <div className="mt-3 space-y-3 text-sm leading-6 text-ink-muted">
            <p>
              The selected template, category, and edited fields save into the invite record so
              this design can drive the hosted RSVP page too.
            </p>
            <p>
              Email delivery still uses the invite message today. Once you finish curating the full
              pack set, we can add rendered-card email output as the next pass.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
