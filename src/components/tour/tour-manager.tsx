"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Map, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_TOUR_STATE, getTourPageKeyFromPath, normalizeTourState, TOUR_STEP_COUNT, TourState } from "@/lib/tour";
import { cn } from "@/lib/utils";

type TourStep = {
  key: string;
  title: string;
  body: string;
  selector?: string;
  href?: string;
  pageKey?: string;
  cta?: string;
};

type TargetBox = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const tourSteps: TourStep[] = [
  {
    key: "welcome",
    title: "Welcome to Party Swami",
    body: "Create invites, manage guests, plan events, shop supplies, and keep every party detail in one guided workspace.",
    selector: "[data-tour-id='workspace-header']",
    href: "/dashboard",
    cta: "Open dashboard",
  },
  {
    key: "dashboard",
    title: "Your party command center",
    body: "The dashboard keeps active events, AI plans, guests, tasks, shopping, and telemetry within reach.",
    selector: "[data-tour-id='dashboard-link']",
    href: "/dashboard",
  },
  {
    key: "create-event",
    title: "Start with a new event",
    body: "Choose the event type, vibe, date, guest count, and budget. Party Swami uses that context to generate the rest.",
    selector: "[data-tour-id='new-event-link']",
    href: "/events/new",
    cta: "Create an event",
  },
  {
    key: "invite-builder",
    title: "Build the invite",
    body: "Use AI copy, templates, premium images, and customization tools to create an invite that is ready to send.",
    selector: "[data-tour-id='page-main']",
    href: "/events/new",
    cta: "Start an event",
  },
  {
    key: "guests",
    title: "Track every guest",
    body: "Add guests, send invitations, and watch RSVP status change in real time from the guest workspace.",
    selector: "[data-tour-id='page-main']",
    href: "/dashboard",
    cta: "Open dashboard",
  },
  {
    key: "planning-tools",
    title: "Stay organized",
    body: "Tasks, timelines, next steps, and budgets help you keep momentum without spreadsheet juggling.",
    selector: "[data-tour-id='page-main']",
    href: "/dashboard",
    cta: "Review planning panels",
  },
  {
    key: "shopping",
    title: "Shop what the party needs",
    body: "Shopping categories and AI recommendations turn the event plan into supplies you can actually buy.",
    selector: "[data-tour-id='page-main']",
    href: "/marketplace",
    cta: "Browse marketplace",
  },
  {
    key: "premium",
    title: "Unlock the premium magic",
    body: "Premium adds AI images, upgraded templates, higher limits, and image packs when you are ready to level up.",
    selector: "[data-tour-id='billing-link']",
    href: "/billing",
    cta: "View billing",
  },
];

const pageTourLabels: Record<string, string> = {
  marketing: "Marketing",
  overview: "Overview",
  dashboard: "Dashboard",
  "create-event": "Create Event",
  marketplace: "Marketplace",
  images: "Image Library",
  billing: "Billing",
  invite: "Invite",
  guests: "Guests",
  "next-steps": "Next Steps",
  timeline: "Timeline",
  settings: "Settings",
  shopping: "Shopping",
  planners: "Planner Search",
  premium: "Premium",
};

const pageTours: Record<string, TourStep[]> = {
  marketing: [
    {
      key: "marketing-hero",
      title: "Marketing home",
      body: "This page introduces Party Swami and guides first-time users into signup or preview flows.",
      selector: "[data-tour-id='marketing-hero']",
      href: "/",
    },
    {
      key: "marketing-actions",
      title: "Primary actions",
      body: "These actions launch host onboarding, dashboard preview, or partner signup.",
      selector: "[data-tour-id='marketing-actions']",
    },
    {
      key: "marketing-preview",
      title: "First-run preview",
      body: "This preview explains the core product journey from setup through event execution.",
      selector: "[data-tour-id='marketing-preview']",
    },
  ],
  overview: [
    {
      key: "overview-hero",
      title: "Overview workspace",
      body: "This is the event control center where Party Swami summarizes your plan, highlights the next best action, and keeps the flow moving.",
      selector: "[data-tour-id='overview-hero']",
    },
    {
      key: "overview-next-step",
      title: "Next best step",
      body: "Use this card to continue from the highest-priority action instead of jumping between pages manually.",
      selector: "[data-tour-id='overview-next-step']",
    },
    {
      key: "overview-glance",
      title: "At a glance",
      body: "This panel calls out guest, shopping, and checklist status so you can quickly spot what still needs attention.",
      selector: "[data-tour-id='overview-at-a-glance']",
    },
    {
      key: "overview-ai-revision",
      title: "AI revision",
      body: "Revise one part of the plan here without rebuilding the whole event.",
      selector: "[data-tour-id='overview-ai-revision']",
    },
    {
      key: "overview-progress-cards",
      title: "Progress cards",
      body: "These cards link directly to Invite, Guests, Shopping, and Timeline with live status for each section.",
      selector: "[data-tour-id='overview-progress-cards']",
    },
    {
      key: "overview-workspace-path",
      title: "Workspace path",
      body: "This path gives you a clean sequence through the core pages so planning stays organized and predictable.",
      selector: "[data-tour-id='overview-workspace-path']",
    },
  ],
  dashboard: [
    {
      key: "dashboard-metrics",
      title: "Dashboard metrics",
      body: "These top cards summarize active events, guests, tasks, and shopping momentum at a glance.",
      selector: "[data-tour-id='dashboard-metrics']",
      href: "/dashboard",
    },
    {
      key: "dashboard-events",
      title: "Recent events",
      body: "Manage active or completed workspaces from this panel with pagination and status controls.",
      selector: "[data-tour-id='dashboard-recent-events']",
    },
    {
      key: "dashboard-ai-summary",
      title: "Latest AI summary",
      body: "This panel shows the most recent AI plan output so you can reopen the latest generated event quickly.",
      selector: "[data-tour-id='dashboard-ai-summary']",
    },
    {
      key: "dashboard-telemetry",
      title: "Usage and telemetry",
      body: "These sections track connection health, AI usage, image usage, and product activity logs.",
      selector: "[data-tour-id='dashboard-telemetry']",
    },
  ],
  "create-event": [
    {
      key: "create-event-occasion",
      title: "Choose occasion",
      body: "Start with an event family. This selection drives the initial invite style and planning context.",
      selector: "[data-tour-id='create-event-occasion-grid']",
      href: "/events/new",
    },
    {
      key: "create-event-details",
      title: "Event details form",
      body: "Guest count, budget, date, location, and vibe give Party Swami the data it needs to scaffold the workspace.",
      selector: "[data-tour-id='create-event-details-form']",
    },
    {
      key: "create-event-preview",
      title: "Live invitation direction",
      body: "This preview updates as you edit so you can confirm the look and feel before creating the event.",
      selector: "[data-tour-id='create-event-preview']",
    },
  ],
  marketplace: [
    {
      key: "marketplace-hero",
      title: "Marketplace overview",
      body: "This page helps hosts discover planners and vendors matched to local event context.",
      selector: "[data-tour-id='marketplace-hero']",
      href: "/marketplace",
    },
    {
      key: "marketplace-search",
      title: "Marketplace search",
      body: "Filter by ZIP, category, radius, and planner service to narrow results quickly.",
      selector: "[data-tour-id='marketplace-search']",
    },
    {
      key: "marketplace-results",
      title: "Marketplace results",
      body: "Review vendor and planner cards here, then open profiles for details and outreach.",
      selector: "[data-tour-id='marketplace-results']",
    },
  ],
  images: [
    {
      key: "images-library",
      title: "Image library",
      body: "This page stores generated invite images so you can reuse them across events.",
      selector: "[data-tour-id='images-library']",
      href: "/images",
    },
    {
      key: "images-grid",
      title: "Generated image grid",
      body: "Each card shows status, resolution, timestamp, and deep-links back to the event invite.",
      selector: "[data-tour-id='images-grid']",
    },
  ],
  billing: [
    {
      key: "billing-current-plan",
      title: "Current plan",
      body: "See your plan tier, billing status, and usage counters, then manage subscription actions from one place.",
      selector: "[data-tour-id='billing-current-plan']",
      href: "/billing",
    },
    {
      key: "billing-pack-history",
      title: "Image pack history",
      body: "Track purchased image packs and when they were added to your account.",
      selector: "[data-tour-id='billing-pack-history']",
    },
    {
      key: "billing-stripe-sync",
      title: "Stripe sync details",
      body: "This troubleshooting panel helps verify customer, subscription, and price linkage.",
      selector: "[data-tour-id='billing-stripe-sync']",
    },
  ],
  invite: [
    {
      key: "invite-template-families",
      title: "Template families",
      body: "Pick a category family first, then choose the design that best matches your event mood.",
      selector: "[data-tour-id='invite-template-families']",
    },
    {
      key: "invite-template-grid",
      title: "Template gallery",
      body: "This gallery lets you switch designs while keeping your event copy and core details intact.",
      selector: "[data-tour-id='invite-template-grid']",
    },
    {
      key: "invite-editor",
      title: "Invite details editor",
      body: "Update title, date, location, and message here. This is the source for what guests actually read.",
      selector: "[data-tour-id='invite-editor-form']",
    },
    {
      key: "invite-preview",
      title: "Live invite preview",
      body: "Preview the card exactly as you edit so text and visuals stay aligned.",
      selector: "[data-tour-id='invite-live-preview']",
    },
    {
      key: "invite-media",
      title: "Invite media tools",
      body: "Download, upload, and AI image options are managed here based on your plan entitlements.",
      selector: "[data-tour-id='invite-media-tools']",
    },
    {
      key: "invite-next-step",
      title: "Next step into Guests",
      body: "Use this handoff to move straight into adding guests and sending invitations.",
      selector: "[data-tour-id='invite-next-step']",
    },
  ],
  guests: [
    {
      key: "guests-tabs",
      title: "Guests sections",
      body: "These tabs split guest work into focused views: Add / Import, All Guests, Pending, Accepted, Declined, and Activity.",
      selector: "[data-tour-id='guests-section-tabs']",
    },
    {
      key: "guests-add-import",
      title: "Add / Import",
      body: "Use Add / Import to bring people into the event either one by one or in bulk.",
      selector: "[data-tour-id='guests-tab-add']",
    },
    {
      key: "guests-all",
      title: "All Guests",
      body: "All Guests shows the full roster with search, filters, and batch actions.",
      selector: "[data-tour-id='guests-tab-all']",
    },
    {
      key: "guests-pending",
      title: "Pending",
      body: "Pending focuses on guests who still need an RSVP decision.",
      selector: "[data-tour-id='guests-tab-pending']",
    },
    {
      key: "guests-accepted",
      title: "Accepted",
      body: "Accepted helps you confirm attendance and plus-one seat impact.",
      selector: "[data-tour-id='guests-tab-accepted']",
    },
    {
      key: "guests-declined",
      title: "Declined",
      body: "Declined keeps non-attending guests out of active planning decisions.",
      selector: "[data-tour-id='guests-tab-declined']",
    },
    {
      key: "guests-activity",
      title: "Activity",
      body: "Activity tracks invitation sends, reminders, and response flow over time.",
      selector: "[data-tour-id='guests-tab-activity']",
    },
    {
      key: "guests-add-single",
      title: "Add one guest",
      body: "This form is for quick one-off additions when you need to add someone immediately.",
      selector: "[data-tour-id='guests-add-single']",
    },
    {
      key: "guests-bulk-import",
      title: "Bulk guest import",
      body: "Use bulk import to upload a CSV and add your full list at once.",
      selector: "[data-tour-id='guests-bulk-import']",
    },
    {
      key: "guests-invite-actions",
      title: "Invite actions",
      body: "Send pending invites and reminders from this panel without leaving the guest page.",
      selector: "[data-tour-id='guests-invite-actions']",
    },
    {
      key: "guests-roster-controls",
      title: "Roster controls",
      body: "Search, filter, and apply batch updates here so guest management stays fast at scale.",
      selector: "[data-tour-id='guests-roster-controls']",
    },
    {
      key: "guests-activity-log",
      title: "Activity log list",
      body: "When you open Activity, this feed shows delivery and reminder history per guest.",
      selector: "[data-tour-id='guests-activity-log']",
    },
  ],
  "next-steps": [
    {
      key: "next-steps-paths",
      title: "Execution paths",
      body: "This page helps you decide how to execute: DIY shopping, planner support, or a mix of both.",
      selector: "[data-tour-id='next-steps-paths']",
    },
    {
      key: "next-steps-diy",
      title: "DIY shopping path",
      body: "Choose this if you want to run purchasing directly from Party Swami recommendations.",
      selector: "[data-tour-id='next-steps-diy']",
    },
    {
      key: "next-steps-planner",
      title: "Professional planner path",
      body: "Choose this when you want to compare planners and request help with execution.",
      selector: "[data-tour-id='next-steps-planner']",
    },
    {
      key: "next-steps-both",
      title: "Hybrid path",
      body: "Use this when you want to keep control of shopping while handing off selected work to a planner.",
      selector: "[data-tour-id='next-steps-both']",
    },
    {
      key: "next-steps-ai",
      title: "AI marketplace assist",
      body: "This section captures context for smarter planner matching based on event details.",
      selector: "[data-tour-id='next-steps-ai-assist']",
    },
  ],
  timeline: [
    {
      key: "timeline-hero",
      title: "Timeline and tracker",
      body: "This page organizes prep and execution so you can run the event without missing key steps.",
      selector: "[data-tour-id='timeline-hero']",
    },
    {
      key: "timeline-add-task",
      title: "Add task form",
      body: "Add new tasks with phase and due labels to keep the checklist current.",
      selector: "[data-tour-id='timeline-add-task']",
    },
    {
      key: "timeline-checklists",
      title: "Checklist groups",
      body: "Tasks are grouped by phase so pre-event and event-week work stay clearly separated.",
      selector: "[data-tour-id='timeline-checklist-columns']",
    },
    {
      key: "timeline-day-of",
      title: "Day-of timeline",
      body: "This run-of-show block sequences the live event moments in order.",
      selector: "[data-tour-id='timeline-day-of']",
    },
    {
      key: "timeline-final-review",
      title: "Final review handoff",
      body: "When tasks look good, return to the event hub for one final cross-check.",
      selector: "[data-tour-id='timeline-final-review']",
    },
  ],
  settings: [
    {
      key: "settings-account",
      title: "Account and security",
      body: "Manage core profile details and billing entry points here.",
      selector: "[data-tour-id='settings-account']",
    },
    {
      key: "settings-privacy",
      title: "Privacy and consent",
      body: "This section explains data visibility, invite sharing, and billing sync behavior.",
      selector: "[data-tour-id='settings-privacy']",
    },
    {
      key: "settings-ai-status",
      title: "AI planning status",
      body: "Review current theme, generation metadata, and usage context for this event.",
      selector: "[data-tour-id='settings-ai-status']",
    },
    {
      key: "settings-plan-revisions",
      title: "Plan revisions",
      body: "Restore earlier AI plan snapshots from this revision history panel.",
      selector: "[data-tour-id='settings-plan-revisions']",
    },
  ],
  shopping: [
    {
      key: "shopping-hero",
      title: "Shopping recommendations",
      body: "This page translates your event plan into practical shopping groups.",
      selector: "[data-tour-id='shopping-hero']",
    },
    {
      key: "shopping-regenerate",
      title: "Regenerate recommendations",
      body: "Use this when budget, guest count, or plan context changes and you want a refreshed list.",
      selector: "[data-tour-id='shopping-regenerate']",
    },
    {
      key: "shopping-summary",
      title: "Shopping summary cards",
      body: "These metrics track groups, total recommendations, spend estimate, and purchase progress.",
      selector: "[data-tour-id='shopping-summary-metrics']",
    },
    {
      key: "shopping-groups",
      title: "Grouped recommendations",
      body: "Each category contains item links, recommendation context, and search terms used.",
      selector: "[data-tour-id='shopping-groups']",
    },
    {
      key: "shopping-next-step",
      title: "Timeline handoff",
      body: "Move to Timeline once shopping looks right so execution tasks stay in sync.",
      selector: "[data-tour-id='shopping-next-step']",
    },
  ],
  planners: [
    {
      key: "planners-search",
      title: "Planner search",
      body: "Search by ZIP to find providers near the event location.",
      selector: "[data-tour-id='planners-search']",
    },
    {
      key: "planners-results",
      title: "Planner results",
      body: "Compare profile details, services, rates, and response expectations in this grid.",
      selector: "[data-tour-id='planners-results']",
    },
    {
      key: "planners-next-step",
      title: "Next step",
      body: "After outreach, continue into Timeline to lock down execution details.",
      selector: "[data-tour-id='planners-next-step']",
    },
  ],
  premium: [
    {
      key: "premium-main",
      title: "Premium feature tour",
      body: "Billing shows the upgrade path for premium templates, AI image tools, higher limits, and image packs.",
      selector: "[data-tour-id='billing-link']",
      href: "/billing",
    },
  ],
};

async function persistPatch(patch: Partial<TourState>) {
  const response = await fetch("/api/tour-update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patch }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { tour_state?: unknown };
  return normalizeTourState(payload.tour_state);
}

export function TourManager() {
  const pathname = usePathname();
  const [tourState, setTourState] = useState<TourState>(DEFAULT_TOUR_STATE);
  const [tourStateLoaded, setTourStateLoaded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mode, setMode] = useState<"full" | "page">("full");
  const [pageTourKey, setPageTourKey] = useState<string | null>(null);
  const [pageStepIndex, setPageStepIndex] = useState(0);
  const [targetBox, setTargetBox] = useState<TargetBox | null>(null);

  const currentPageKey = useMemo(() => getTourPageKeyFromPath(pathname), [pathname]);
  const activePageSteps = mode === "page" && pageTourKey ? pageTours[pageTourKey] ?? [] : [];
  const clampedPageStepIndex = Math.min(Math.max(pageStepIndex, 0), Math.max(activePageSteps.length - 1, 0));
  const activeStep =
    mode === "page"
      ? activePageSteps[clampedPageStepIndex]
      : tourSteps[tourState?.current_step ?? 0];
  const canGoBack = mode === "full" ? Boolean(tourState?.current_step) : clampedPageStepIndex > 0;
  const progress =
    mode === "full"
      ? ((tourState?.current_step ?? 0) + 1) / TOUR_STEP_COUNT
      : activePageSteps.length > 0
        ? (clampedPageStepIndex + 1) / activePageSteps.length
        : 1;

  useEffect(() => {
    let isMounted = true;

    fetch("/api/tour-state")
      .then((response) => (response.ok ? response.json() : { tour_state: DEFAULT_TOUR_STATE }))
      .then((payload: { tour_state?: unknown }) => {
        if (!isMounted) {
          return;
        }

        const nextState = normalizeTourState(payload.tour_state);
        setTourState(nextState);
        setTourStateLoaded(true);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        setTourState(DEFAULT_TOUR_STATE);
        setTourStateLoaded(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ mode?: "full" | "page"; step?: number; pageKey?: string }>;
      const requestedStep = Number.isInteger(customEvent.detail?.step) ? Number(customEvent.detail?.step) : 0;
      const requestedMode = customEvent.detail?.mode ?? "full";

      if (requestedMode === "page") {
        const resolvedPageKey = customEvent.detail?.pageKey ?? getTourPageKeyFromPath(pathname);
        const resolvedSteps = resolvedPageKey ? pageTours[resolvedPageKey] : null;
        if (!resolvedPageKey || !resolvedSteps?.length) {
          return;
        }

        requestAnimationFrame(() => {
          setMode("page");
          setPageTourKey(resolvedPageKey);
          setPageStepIndex(0);
          setIsMenuOpen(false);
          setIsOpen(true);
        });
        return;
      }

      const clampedStep = Math.min(Math.max(requestedStep, 0), TOUR_STEP_COUNT - 1);
      void persistPatch({
        started: true,
        completed: false,
        skipped: false,
        current_step: clampedStep,
      }).then((persisted) => {
        setTourState((current) =>
          persisted ?? normalizeTourState({ ...current, started: true, completed: false, skipped: false, current_step: clampedStep }),
        );
      });
      requestAnimationFrame(() => {
        setMode("full");
        setPageTourKey(null);
        setPageStepIndex(0);
        setIsMenuOpen(false);
        setIsOpen(true);
      });
    };

    const closeHandler = () => {
      requestAnimationFrame(() => {
        setIsOpen(false);
        setIsMenuOpen(false);
      });
    };

    window.addEventListener("party-swami-tour:open", handler as EventListener);
    window.addEventListener("party-swami-tour:close", closeHandler as EventListener);
    return () => {
      window.removeEventListener("party-swami-tour:open", handler as EventListener);
      window.removeEventListener("party-swami-tour:close", closeHandler as EventListener);
    };
  }, [pathname]);

  useEffect(() => {
    if (!tourStateLoaded) {
      return;
    }

    if (!currentPageKey) {
      return;
    }

    const visitedPages = tourState.visited_pages.includes(currentPageKey)
      ? tourState.visited_pages
      : [...tourState.visited_pages, currentPageKey];

    if (visitedPages !== tourState.visited_pages) {
      void persistPatch({ visited_pages: visitedPages }).then((persisted) => {
        if (persisted) {
          setTourState(persisted);
        } else {
          setTourState((current) => current ? { ...current, visited_pages: visitedPages } : current);
        }
      });
    }

    if (
      !tourState.skipped &&
      !isOpen &&
      currentPageKey &&
      !tourState.page_tours_completed.includes(currentPageKey) &&
      (pageTours[currentPageKey]?.length ?? 0) > 0
    ) {
      requestAnimationFrame(() => {
        setMode("page");
        setPageTourKey(currentPageKey);
        setPageStepIndex(0);
        setIsOpen(true);
      });
    }
  }, [currentPageKey, isOpen, tourState, tourStateLoaded]);

  useEffect(() => {
    if (!isOpen || !activeStep?.selector) {
      requestAnimationFrame(() => setTargetBox(null));
      return;
    }

    const updateTarget = () => {
      const target = document.querySelector(activeStep.selector ?? "");

      if (!target) {
        setTargetBox(null);
        return;
      }

      const rect = target.getBoundingClientRect();
      setTargetBox({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
      });
    };

    updateTarget();
    window.addEventListener("resize", updateTarget);
    window.addEventListener("scroll", updateTarget, true);

    return () => {
      window.removeEventListener("resize", updateTarget);
      window.removeEventListener("scroll", updateTarget, true);
    };
  }, [activeStep?.selector, isOpen]);

  async function startFullTour(step = 0) {
    const nextState = await persistPatch({
      started: true,
      completed: false,
      skipped: false,
      current_step: step,
    });
    setTourState(nextState ?? normalizeTourState({ ...tourState, started: true, current_step: step }));
    setMode("full");
    setPageTourKey(null);
    setPageStepIndex(0);
    setIsMenuOpen(false);
    setIsOpen(true);
  }

  async function skipTour() {
    const nextState = await persistPatch({
      started: false,
      completed: false,
      skipped: true,
    });
    setTourState(nextState ?? normalizeTourState({ ...tourState, skipped: true }));
    setIsOpen(false);
    setIsMenuOpen(false);
  }

  async function completeTour() {
    const response = await fetch("/api/tour-complete", { method: "POST" });
    const payload = response.ok ? ((await response.json()) as { tour_state?: unknown }) : null;
    setTourState(normalizeTourState(payload?.tour_state ?? { ...tourState, completed: true }));
    setIsOpen(false);
    setIsMenuOpen(false);
  }

  async function markPageTourDone() {
    if (!pageTourKey) {
      setIsOpen(false);
      return;
    }

    const page_tours_completed = tourState.page_tours_completed.includes(pageTourKey)
      ? tourState.page_tours_completed
      : [...tourState.page_tours_completed, pageTourKey];
    const nextState = await persistPatch({ page_tours_completed });
    setTourState(nextState ?? { ...tourState, page_tours_completed });
    setIsOpen(false);
    setPageTourKey(null);
    setPageStepIndex(0);
  }

  async function goNext() {
    if (mode === "page") {
      if (activePageSteps.length > 0 && clampedPageStepIndex < activePageSteps.length - 1) {
        setPageStepIndex((current) => current + 1);
        return;
      }
      await markPageTourDone();
      return;
    }

    if (tourState.current_step >= TOUR_STEP_COUNT - 1) {
      await completeTour();
      return;
    }

    const current_step = tourState.current_step + 1;
    const nextState = await persistPatch({
      started: true,
      completed: false,
      skipped: false,
      current_step,
    });
    setTourState(nextState ?? { ...tourState, started: true, current_step });
  }

  async function goBack() {
    if (mode === "page") {
      setPageStepIndex((current) => Math.max(0, current - 1));
      return;
    }

    if (mode !== "full") {
      return;
    }

    const current_step = Math.max(0, tourState.current_step - 1);
    const nextState = await persistPatch({ current_step });
    setTourState(nextState ?? { ...tourState, current_step });
  }

  function openPageTour(key: string) {
    setMode("page");
    setPageTourKey(key);
    setPageStepIndex(0);
    setIsMenuOpen(false);
    setIsOpen(true);
  }

  const pageStepCount = Math.max(activePageSteps.length, 1);

  return (
    <>
      <button
        type="button"
        aria-label="Open Party Swami tour"
        className="fixed bottom-28 right-5 z-[62] flex size-16 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white shadow-[0_18px_42px_rgba(76,46,148,0.26)] transition hover:scale-105 focus:outline-none focus:ring-4 focus:ring-brand/25 sm:right-6"
        onClick={() => setIsMenuOpen((value) => !value)}
      >
        <Image
          src="/party-swami-assistant.png"
          width={96}
          height={96}
          alt="Party Swami tour assistant"
          className="size-full object-cover"
        />
      </button>

      {isMenuOpen ? (
        <div className="fixed bottom-48 right-5 z-[62] w-[min(22rem,calc(100vw-2.5rem))] rounded-[1.5rem] border border-white/80 bg-white/95 p-4 text-sm text-ink shadow-party backdrop-blur sm:right-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">Tour of Party Swami</p>
              <p className="mt-1 text-ink-muted">Restart the full tour or jump to a section.</p>
            </div>
            <button
              type="button"
              aria-label="Close tour menu"
              className="rounded-full p-2 text-ink-muted transition hover:bg-canvas hover:text-ink"
              onClick={() => setIsMenuOpen(false)}
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-4 grid gap-2">
            <Button type="button" className="w-full" onClick={() => void startFullTour(0)}>
              <Map className="size-4" />
              Restart full tour
            </Button>
            <div className="grid grid-cols-2 gap-2">
              {Object.keys(pageTours).map((key) => (
                <button
                  key={key}
                  type="button"
                  className="rounded-2xl border border-border bg-canvas px-3 py-2 text-left text-xs font-medium text-ink transition hover:border-brand/40 hover:bg-white"
                  onClick={() => openPageTour(key)}
                >
                  {pageTourLabels[key] ?? key}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {isOpen && activeStep ? (
        <div className="fixed inset-0 z-[60] pointer-events-none">
          <div className="absolute inset-0 bg-ink/18" />
          {targetBox ? (
            <div
              className="absolute rounded-[1.5rem] border-2 border-warning bg-white/12 shadow-[0_0_0_9999px_rgba(7,17,47,0.18),0_0_0_8px_rgba(255,191,71,0.18)]"
              style={{
                top: Math.max(8, targetBox.top - 8),
                left: Math.max(8, targetBox.left - 8),
                width: targetBox.width + 16,
                height: targetBox.height + 16,
              }}
            />
          ) : null}
          <div className="pointer-events-auto fixed bottom-6 left-1/2 w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 rounded-[1.75rem] border border-white/80 bg-white/95 p-4 text-ink shadow-party backdrop-blur md:bottom-8 md:right-8 md:left-auto md:translate-x-0">
            <div className="flex items-start gap-4">
              <div className="relative size-16 shrink-0 overflow-hidden rounded-full border-4 border-accent-soft bg-white">
                <Image
                  src="/party-swami-assistant.png"
                  fill
                  sizes="64px"
                  alt=""
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                      {mode === "full"
                        ? `Step ${(tourState.current_step ?? 0) + 1} of ${TOUR_STEP_COUNT}`
                        : `Page step ${Math.min(clampedPageStepIndex + 1, pageStepCount)} of ${pageStepCount}`}
                    </p>
                    <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">{activeStep.title}</h2>
                  </div>
                  <button
                    type="button"
                    aria-label="Close tour"
                    className="rounded-full p-2 text-ink-muted transition hover:bg-canvas hover:text-ink"
                    onClick={() => (mode === "page" ? void markPageTourDone() : setIsOpen(false))}
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{activeStep.body}</p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-canvas">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#ff7bd5,#ffbf47,#2f8fff)] transition-all"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className={cn(!canGoBack && "invisible")}
                      onClick={() => void goBack()}
                    >
                      <ChevronLeft className="size-4" />
                      Back
                    </Button>
                    {activeStep.href ? (
                      <Button asChild variant="secondary">
                        <Link href={activeStep.href}>{activeStep.cta ?? "Open page"}</Link>
                      </Button>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {mode === "full" ? (
                      <Button type="button" variant="ghost" onClick={() => void skipTour()}>
                        Skip
                      </Button>
                    ) : null}
                    <Button type="button" onClick={() => void goNext()}>
                      {mode === "full"
                        ? tourState.current_step >= TOUR_STEP_COUNT - 1
                          ? "Finish"
                          : "Continue"
                        : clampedPageStepIndex >= activePageSteps.length - 1
                          ? "Finish page guide"
                          : "Continue"}
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
