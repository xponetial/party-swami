import Link from "next/link";
import type { ComponentType } from "react";
import {
  ArrowRight,
  CalendarCheck2,
  ClipboardList,
  FileText,
  Handshake,
  ListChecks,
  MapPinned,
  ShoppingBag,
  Sparkles,
  Users,
} from "lucide-react";
import {
  type EventDetails,
  type GuestDetails,
  type InviteDetails,
  type PartyPlanDetails,
  type ShoppingItemDetails,
  type TaskDetails,
} from "@/lib/events";
import {
  normalizeInviteDesignData,
  type InviteDesignData,
} from "@/lib/invite-design";
import { getInviteTemplateCatalog } from "@/lib/invite-template-catalog";
import { findInviteTemplate } from "@/lib/invite-template-types";
import { loadEventAnswers } from "@/features/event-intelligence/services/event-intelligence";
import { AiRevisePlanForm } from "@/components/ai/ai-revise-plan-form";
import { AiGenerateButton } from "@/components/ai/ai-generate-button";
import { InviteCardCanvas } from "@/components/invite/invite-card-canvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type EventWorkspaceOverviewProps = {
  eventId: string;
  event: EventDetails;
  invite: InviteDetails | null;
  plan: PartyPlanDetails | null;
  guests: GuestDetails[];
  shoppingItems: ShoppingItemDetails[];
  tasks: TaskDetails[];
};

type WorkflowStep = {
  id: string;
  href: string;
  label: string;
  detail: string;
  stepNumber: number;
  done: boolean;
  icon: ComponentType<{ className?: string }>;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferCategoryKey(
  eventType: string,
  categories: Awaited<ReturnType<typeof getInviteTemplateCatalog>>,
) {
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

function buildInvitePreviewDesign(
  event: EventDetails,
  invite: InviteDetails,
  categories: Awaited<ReturnType<typeof getInviteTemplateCatalog>>,
): InviteDesignData {
  const categoryKey = inferCategoryKey(event.event_type, categories);
  const template =
    categories.find((category) => category.key === categoryKey)?.templates[0] ??
    categories[0]?.templates[0];

  if (!template) {
    throw new Error("Invite template catalog is empty.");
  }

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

function formatSentState(invite: InviteDetails | null) {
  if (!invite?.sent_at) {
    return "Not sent yet";
  }

  return new Date(invite.sent_at).toLocaleString("en-US");
}

export async function EventWorkspaceOverview({
  eventId,
  event,
  invite,
  plan,
  guests,
  shoppingItems,
  tasks,
}: EventWorkspaceOverviewProps) {
  const supabase = await createSupabaseServerClient();
  const intakeAnswers = await loadEventAnswers(supabase, eventId).catch(() => []);
  const intakeByKey = Object.fromEntries(intakeAnswers.map((answer) => [answer.question_key, answer.answer]));
  const servicesRequested = Array.isArray(intakeByKey.services_requested)
    ? intakeByKey.services_requested.filter((item): item is string => typeof item === "string")
    : [];
  const aiHelpRequested = Array.isArray(intakeByKey.ai_help_requested)
    ? intakeByKey.ai_help_requested.filter((item): item is string => typeof item === "string")
    : [];
  const servicesText = servicesRequested.map((item) => item.toLowerCase());
  const aiHelpText = aiHelpRequested.map((item) => item.toLowerCase());
  const needsVendorStep =
    servicesText.length > 0 ||
    aiHelpText.some((item) => item.includes("vendor"));
  const needsPlannerStep =
    servicesText.some((item) => item.includes("planner")) ||
    aiHelpText.some((item) => item.includes("full event planning"));

  const completedTasks = tasks.filter((task) => task.status === "completed").length;
  const pendingGuests = guests.filter((guest) => guest.status === "pending").length;
  const hasInviteDraft = Boolean(invite?.invite_copy?.trim());
  const hasIntakeAnswers = intakeAnswers.length > 0;
  const hasPathSelectionSignal =
    shoppingItems.length > 0 ||
    tasks.length > 0 ||
    Boolean(plan?.required_vendor_categories?.length) ||
    Boolean(plan?.vendor_matches?.length);
  const vendorReady = Boolean(plan?.vendor_matches?.length);
  const plannerReady = false;
  const workflowSteps: WorkflowStep[] = [
    {
      id: "create-event",
      href: `/events/${eventId}/edit`,
      label: "Create Event",
      detail: "Keep the title, date, budget, and event setup details current.",
      stepNumber: 1,
      done: true,
      icon: CalendarCheck2,
    },
    {
      id: "extended-questions",
      href: `/events/${eventId}/intake`,
      label: "Extended Questions",
      detail: "Capture intent and service needs so Party Swami can personalize the workflow.",
      stepNumber: 2,
      done: hasIntakeAnswers,
      icon: FileText,
    },
    {
      id: "invite-generation",
      href: `/events/${eventId}/invite`,
      label: "Invite Generation",
      detail: "Generate and polish invite copy and card design before outreach.",
      stepNumber: 3,
      done: hasInviteDraft,
      icon: Sparkles,
    },
    {
      id: "guest-management",
      href: `/events/${eventId}/guests/add`,
      label: "Guest Management",
      detail: "Build your guest list and set up RSVP tracking.",
      stepNumber: 4,
      done: guests.length > 0,
      icon: Users,
    },
    {
      id: "pick-your-path",
      href: `/events/${eventId}/next-steps`,
      label: "Pick Your Path",
      detail: "Choose the planning path before shopping and provider matching.",
      stepNumber: 5,
      done: hasPathSelectionSignal,
      icon: ListChecks,
    },
    {
      id: "shopping",
      href: `/events/${eventId}/shopping`,
      label: "Shopping",
      detail: "Review recommendations and track event spending.",
      stepNumber: 6,
      done: shoppingItems.length > 0,
      icon: ShoppingBag,
    },
    {
      id: "vendor-recommendations",
      href: `/events/${eventId}/vendors`,
      label: "Vendor Recommendations",
      detail: "Compare and save marketplace vendor matches.",
      stepNumber: 7,
      done: vendorReady,
      icon: Handshake,
    },
    {
      id: "planner-search",
      href: `/events/${eventId}/planners`,
      label: "Planner Search",
      detail: "Review planners if extended questions indicate extra planning support.",
      stepNumber: 8,
      done: plannerReady,
      icon: MapPinned,
    },
    {
      id: "timeline",
      href: `/events/${eventId}/timeline`,
      label: "Timeline",
      detail: "Turn planning into an execution-ready run-of-show.",
      stepNumber: 9,
      done: tasks.length > 0,
      icon: ClipboardList,
    },
  ].filter((step) => {
    if (step.id === "vendor-recommendations") return needsVendorStep;
    if (step.id === "planner-search") return needsPlannerStep;
    return true;
  });
  const nextStep = workflowSteps.find((step) => !step.done) ?? null;
  const primaryStep = nextStep
    ? {
        href: nextStep.href,
        label: nextStep.label,
        detail: nextStep.detail,
        step: `Step ${nextStep.stepNumber} of 9`,
      }
    : {
        href: `/events/${eventId}/timeline`,
        label: "Timeline review",
        detail: "Everything is set. Do one final timeline check before go time.",
        step: "Ready to host",
      };
  const themeLabel = plan?.theme ?? event.theme ?? `${event.event_type} celebration`;
  const templateCategories = invite ? await getInviteTemplateCatalog() : [];
  const invitePreviewDesign =
    invite && templateCategories.length
      ? buildInvitePreviewDesign(event, invite, templateCategories)
      : null;
  const invitePreviewTemplate =
    invitePreviewDesign && templateCategories.length
      ? findInviteTemplate(templateCategories, {
          templateId: invitePreviewDesign.templateId,
          packSlug: invitePreviewDesign.packSlug,
        })
      : null;

  const progressCards = [
    {
      href: `/events/${eventId}/invite`,
      label: "Invite",
      value: invite?.sent_at ? "Sent" : invite?.invite_copy?.trim() ? "Ready" : "Needs work",
      detail: invite?.sent_at ? formatSentState(invite) : "Card and copy status",
      icon: Sparkles,
    },
    {
      href: `/events/${eventId}/guests/add`,
      label: "Guests",
      value: String(guests.length),
      detail: pendingGuests
        ? `${pendingGuests} pending RSVP${pendingGuests === 1 ? "" : "s"}`
        : "No pending RSVPs",
      icon: Users,
    },
    {
      href: `/events/${eventId}/shopping`,
      label: "Shopping",
      value: String(shoppingItems.length),
      detail: shoppingItems.length ? "Recommendations ready" : "Needs review",
      icon: ShoppingBag,
    },
    {
      href: `/events/${eventId}/timeline`,
      label: "Timeline",
      value: `${completedTasks}/${tasks.length || 0}`,
      detail: tasks.length ? "Tasks completed" : "No tasks yet",
      icon: ClipboardList,
    },
  ];

  const actionCards = workflowSteps.map((step) => ({
    href: step.href,
    eyebrow: `Step ${step.stepNumber}`,
    label: step.label,
    detail: step.detail,
    stat: step.done ? "Complete" : "Next up",
    icon: step.icon,
  }));

  const quickSummary = [
    guests.length === 0
      ? "No guests yet. Start by importing or adding your first attendees."
      : `${guests.length} guest${guests.length === 1 ? "" : "s"} are already connected to this event.`,
    shoppingItems.length === 0
      ? "Shopping recommendations still need a review."
      : `${shoppingItems.length} shopping item${shoppingItems.length === 1 ? "" : "s"} are already tracked.`,
    tasks.length === 0
      ? "No run-of-show tasks are stored yet."
      : `${completedTasks} task${completedTasks === 1 ? "" : "s"} are already complete.`,
  ];

  return (
    <div className="grid gap-4">
      <Card data-tour-id="overview-hero" className="bg-white/85">
        <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-[1.9rem] border border-border bg-[rgba(244,247,255,0.82)] p-5">
            <Badge variant="success">{event.status}</Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink">{event.title}</h2>
            <p className="mt-3 text-base leading-7 text-ink-muted">
              {themeLabel} is in motion. Use this hub to move through the event in order without
              bouncing between oversized summary blocks.
            </p>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-center">
              <div data-tour-id="overview-next-step">
                <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Next best step</p>
                <p className="mt-2 text-sm font-medium text-brand">{primaryStep.step}</p>
                <h3 className="mt-3 text-2xl font-semibold text-ink">{primaryStep.label}</h3>
                <p className="mt-3 text-sm leading-7 text-ink-muted">{primaryStep.detail}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button asChild>
                    <Link href={primaryStep.href}>
                      Continue
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link href={`/events/${eventId}/invite`}>Edit invite</Link>
                  </Button>
                </div>
              </div>

              <div className="mx-auto w-full max-w-[240px]">
                {invitePreviewDesign && invitePreviewTemplate ? (
                  <InviteCardCanvas
                    alt={`${event.title} invite preview`}
                    design={invitePreviewDesign}
                    maxWidth={240}
                    template={invitePreviewTemplate}
                  />
                ) : (
                  <div className="rounded-[1.75rem] border border-dashed border-border bg-white/70 px-5 py-8 text-center text-sm leading-7 text-ink-muted">
                    The invite preview will appear here once the event has a saved design.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div data-tour-id="overview-at-a-glance" className="rounded-[1.9rem] border border-border bg-white/82 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">At a glance</p>
              <div className="mt-4 space-y-3">
                {quickSummary.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl bg-canvas px-4 py-3">
                    <Sparkles className="mt-0.5 size-4 text-brand" />
                    <p className="text-sm leading-6 text-ink-muted">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div data-tour-id="overview-ai-revision" className="rounded-[1.9rem] border border-border bg-white/82 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">AI revision</p>
              <p className="mt-2 text-sm leading-6 text-ink-muted">
                Need a sharper pivot? Revise one specific part without rebuilding the whole event.
              </p>
              <div className="mt-4">
                <AiGenerateButton
                  endpoint="/api/ai/one-click"
                  eventId={eventId}
                  label="Plan My Party (1-Click)"
                  pendingLabel="Generating full plan..."
                />
              </div>
              <div className="mt-4">
                <AiRevisePlanForm eventId={eventId} />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div data-tour-id="overview-progress-cards" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {progressCards.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="rounded-[2rem] border border-white/75 bg-[linear-gradient(140deg,rgba(255,246,255,0.96)_0%,rgba(248,233,255,0.92)_32%,rgba(239,245,255,0.92)_72%,rgba(255,250,244,0.94)_100%)] p-6 shadow-party backdrop-blur transition hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="rounded-2xl bg-canvas p-3 text-brand">
                <item.icon className="size-5" />
              </div>
              <span className="text-xs uppercase tracking-[0.18em] text-ink-muted">
                {item.label}
              </span>
            </div>
            <p className="mt-4 text-3xl font-semibold text-ink">{item.value}</p>
            <p className="mt-2 text-sm leading-6 text-ink-muted">{item.detail}</p>
          </Link>
        ))}
      </div>

      <Card data-tour-id="overview-workspace-path" className="bg-[rgba(244,247,255,0.9)]">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Workspace path</p>
          <h3 className="mt-2 text-2xl font-semibold text-ink">Go where the work actually happens</h3>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {actionCards.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-[1.75rem] border border-border bg-white/85 p-5 transition hover:-translate-y-0.5"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">{item.eyebrow}</p>
              <div className="mt-3 flex items-center gap-2">
                <item.icon className="size-4 text-brand" />
                <p className="text-lg font-semibold text-ink">{item.label}</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-ink-muted">{item.detail}</p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-[0.18em] text-ink-muted">
                  {item.stat}
                </span>
                <ArrowRight className="size-4 text-brand" />
              </div>
            </Link>
          ))}
        </div>
      </Card>

      <Card className="bg-white/90">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Vendor matches</p>
            <h3 className="mt-2 text-2xl font-semibold text-ink">Recommended providers</h3>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Ranked using AI Brain scoring for rating, price fit, distance, and availability.
            </p>
          </div>
          {plan?.complexity_score ? <Badge>Complexity: {plan.complexity_score}/100</Badge> : null}
        </div>

        {plan?.vendor_matches?.length ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {plan.vendor_matches.map((vendor) => (
              <Link
                key={vendor.vendor_id}
                href={`/vendors/${vendor.slug}`}
                className="rounded-2xl border border-border bg-white px-4 py-3 transition hover:border-brand/35"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">{vendor.business_name}</p>
                  <Badge variant={vendor.recommended ? "success" : "default"}>
                    Score {vendor.score}
                  </Badge>
                </div>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-ink-muted">
                  {vendor.category}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-border bg-white/70 px-4 py-3 text-sm text-ink-muted">
            Run 1-click planning to generate ranked vendor recommendations.
          </p>
        )}
      </Card>
    </div>
  );
}
