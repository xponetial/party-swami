"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, HelpCircle, Map, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTourPageKeyFromPath, normalizeTourState, TOUR_STEP_COUNT, TourState } from "@/lib/tour";
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

const pageTours: Record<string, TourStep> = {
  overview: {
    key: "overview-mini",
    title: "Overview tour",
    body: "Overview is your event snapshot: invite readiness, guest progress, shopping momentum, and checklist status in one place.",
    selector: "[data-tour-id='event-nav-overview']",
  },
  dashboard: {
    key: "dashboard-mini",
    title: "Dashboard tour",
    body: "This is where returning hosts see active parties, AI plan snapshots, guest counts, tasks, shopping, and usage.",
    selector: "[data-tour-id='page-main']",
    href: "/dashboard",
  },
  "create-event": {
    key: "create-event-mini",
    title: "Create event tour",
    body: "Fill in the party basics here. The selections you make become context for invites, plans, tasks, and shopping.",
    selector: "[data-tour-id='page-main']",
    href: "/events/new",
  },
  invite: {
    key: "invite-mini",
    title: "Invite builder tour",
    body: "This page combines AI-generated invite copy, template customization, image access, sending, and RSVP controls.",
    selector: "[data-tour-id='page-main']",
  },
  guests: {
    key: "guests-mini",
    title: "Guest management tour",
    body: "Use this workspace to add guests, monitor RSVP status, and keep outreach organized.",
    selector: "[data-tour-id='event-nav-guests']",
  },
  "next-steps": {
    key: "next-steps-mini",
    title: "Next steps tour",
    body: "Next Steps helps you choose the execution path: DIY shopping, planner support, or direct vendor outreach.",
    selector: "[data-tour-id='event-nav-next-steps']",
  },
  timeline: {
    key: "timeline-mini",
    title: "Timeline tour",
    body: "Timeline keeps preparation and day-of execution structured with tasks, milestones, and completion tracking.",
    selector: "[data-tour-id='event-nav-timeline']",
  },
  settings: {
    key: "settings-mini",
    title: "Settings tour",
    body: "Settings covers profile controls, privacy and billing context, plus AI plan version history and restore options.",
    selector: "[data-tour-id='event-nav-settings']",
  },
  shopping: {
    key: "shopping-mini",
    title: "Shopping tour",
    body: "Categories, quantities, estimates, and AI regeneration help you build the party supply list from the plan.",
    selector: "[data-tour-id='event-nav-shopping']",
  },
  planners: {
    key: "planners-mini",
    title: "Planner search tour",
    body: "Planner Search lets you compare planning professionals tied to your event context and request help quickly.",
    selector: "[data-tour-id='event-nav-planners']",
  },
  premium: {
    key: "premium-mini",
    title: "Premium feature tour",
    body: "Billing shows the upgrade path for premium templates, AI image tools, higher limits, and image packs.",
    selector: "[data-tour-id='billing-link']",
    href: "/billing",
  },
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
  const [tourState, setTourState] = useState<TourState | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mode, setMode] = useState<"full" | "page">("full");
  const [pageTourKey, setPageTourKey] = useState<string | null>(null);
  const [targetBox, setTargetBox] = useState<TargetBox | null>(null);

  const currentPageKey = useMemo(() => getTourPageKeyFromPath(pathname), [pathname]);
  const activeStep = mode === "page" && pageTourKey
    ? pageTours[pageTourKey]
    : tourSteps[tourState?.current_step ?? 0];
  const canGoBack = mode === "full" && Boolean(tourState?.current_step);
  const progress = mode === "full" ? ((tourState?.current_step ?? 0) + 1) / TOUR_STEP_COUNT : 1;

  useEffect(() => {
    let isMounted = true;

    fetch("/api/tour-state")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { tour_state?: unknown } | null) => {
        if (!isMounted || !payload) {
          return;
        }

        const nextState = normalizeTourState(payload.tour_state);
        setTourState(nextState);

        if (!nextState.started && !nextState.completed && !nextState.skipped) {
          setIsOpen(true);
          setMode("full");
        }
      })
      .catch(() => undefined);

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
        if (!resolvedPageKey || !pageTours[resolvedPageKey]) {
          return;
        }

        requestAnimationFrame(() => {
          setMode("page");
          setPageTourKey(resolvedPageKey);
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
    if (!tourState || !currentPageKey) {
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
      tourState.started &&
      !tourState.completed &&
      !tourState.skipped &&
      !isOpen
    ) {
      const stepPageKey = tourSteps[tourState.current_step]?.pageKey;

      if (stepPageKey && stepPageKey === currentPageKey) {
        requestAnimationFrame(() => {
          setMode("full");
          setIsOpen(true);
        });
        return;
      }
    }

    if (
      !tourState.skipped &&
      !isOpen &&
      currentPageKey &&
      !tourState.page_tours_completed.includes(currentPageKey)
    ) {
      requestAnimationFrame(() => {
        setMode("page");
        setPageTourKey(currentPageKey);
        setIsOpen(true);
      });
    }
  }, [currentPageKey, isOpen, tourState]);

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
    if (!tourState || !pageTourKey) {
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
  }

  async function goNext() {
    if (!tourState) {
      return;
    }

    if (mode === "page") {
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
    if (!tourState || mode !== "full") {
      return;
    }

    const current_step = Math.max(0, tourState.current_step - 1);
    const nextState = await persistPatch({ current_step });
    setTourState(nextState ?? { ...tourState, current_step });
  }

  function openPageTour(key: string) {
    setMode("page");
    setPageTourKey(key);
    setIsMenuOpen(false);
    setIsOpen(true);
  }

  if (!tourState) {
    return null;
  }

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
              {Object.entries(pageTours).map(([key, step]) => (
                <button
                  key={key}
                  type="button"
                  className="rounded-2xl border border-border bg-canvas px-3 py-2 text-left text-xs font-medium text-ink transition hover:border-brand/40 hover:bg-white"
                  onClick={() => openPageTour(key)}
                >
                  {step.title.replace(" tour", "")}
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
                      {mode === "full" ? `Step ${(tourState.current_step ?? 0) + 1} of ${TOUR_STEP_COUNT}` : "Page guide"}
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
                      {mode === "full" && tourState.current_step >= TOUR_STEP_COUNT - 1 ? "Finish" : "Continue"}
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="pointer-events-none fixed bottom-24 right-6 hidden items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-medium text-ink shadow-party md:flex">
            <HelpCircle className="size-3.5 text-brand" />
            Help / Tour
          </div>
        </div>
      ) : null}

      {!isOpen && !isMenuOpen && !tourState.completed && !tourState.skipped ? (
        <button
          type="button"
          className="fixed bottom-[7.25rem] right-[5.75rem] z-[61] hidden rounded-full bg-white px-3 py-2 text-xs font-semibold text-ink shadow-party transition hover:text-brand sm:block"
          onClick={() => void startFullTour(tourState.current_step)}
        >
          Continue tour
        </button>
      ) : null}
    </>
  );
}
