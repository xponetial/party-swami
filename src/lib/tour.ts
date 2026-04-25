export type TourState = {
  started: boolean;
  completed: boolean;
  skipped: boolean;
  current_step: number;
  visited_pages: string[];
  page_tours_completed: string[];
  updated_at?: string;
};

export const TOUR_STEP_COUNT = 8;

export const DEFAULT_TOUR_STATE: TourState = {
  started: false,
  completed: false,
  skipped: false,
  current_step: 0,
  visited_pages: [],
  page_tours_completed: [],
};

export function normalizeTourState(value: unknown): TourState {
  const source = typeof value === "object" && value !== null ? (value as Partial<TourState>) : {};
  const currentStep = Number.isInteger(source.current_step) ? Number(source.current_step) : 0;

  return {
    ...DEFAULT_TOUR_STATE,
    ...source,
    started: Boolean(source.started),
    completed: Boolean(source.completed),
    skipped: Boolean(source.skipped),
    current_step: Math.min(Math.max(currentStep, 0), TOUR_STEP_COUNT - 1),
    visited_pages: Array.isArray(source.visited_pages)
      ? source.visited_pages.filter((item): item is string => typeof item === "string")
      : [],
    page_tours_completed: Array.isArray(source.page_tours_completed)
      ? source.page_tours_completed.filter((item): item is string => typeof item === "string")
      : [],
    updated_at: typeof source.updated_at === "string" ? source.updated_at : undefined,
  };
}

export function mergeTourState(current: unknown, patch: Partial<TourState>): TourState {
  return normalizeTourState({
    ...normalizeTourState(current),
    ...patch,
    updated_at: new Date().toISOString(),
  });
}

export function getTourPageKeyFromPath(pathname: string): string | null {
  const normalizedPath = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;

  if (pathname === "/") {
    return "marketing";
  }

  if (/^\/events\/[^/]+$/.test(normalizedPath)) {
    return "overview";
  }

  if (normalizedPath === "/dashboard") {
    return "dashboard";
  }

  if (normalizedPath === "/events/new") {
    return "create-event";
  }

  if (/^\/vendors\/dashboard$/.test(normalizedPath)) {
    return "vendor-dashboard";
  }

  if (/^\/planners\/dashboard$/.test(normalizedPath)) {
    return "planner-dashboard";
  }

  if (normalizedPath === "/marketplace") {
    return "marketplace";
  }

  if (normalizedPath === "/images") {
    return "images";
  }

  if (normalizedPath === "/billing") {
    return "billing";
  }

  if (normalizedPath.includes("/invite")) {
    return "invite";
  }

  if (normalizedPath.includes("/guests")) {
    return "guests";
  }

  if (normalizedPath.includes("/next-steps")) {
    return "next-steps";
  }

  if (normalizedPath.includes("/timeline")) {
    return "timeline";
  }

  if (normalizedPath.includes("/settings")) {
    return "settings";
  }

  if (normalizedPath.includes("/shopping")) {
    return "shopping";
  }

  if (/^\/events\/[^/]+\/planners/.test(normalizedPath)) {
    return "planners";
  }

  if (normalizedPath === "/pricing") {
    return "premium";
  }

  return null;
}
