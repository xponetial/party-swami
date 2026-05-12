import { SupabaseClient } from "@supabase/supabase-js";
import { type GeneratedShoppingItem } from "@/lib/ai/party-genie";
import { generatePlanForEvent, generateShoppingListForEvent } from "@/lib/ai/workflows";
import {
  buildAgentInvocationPlan,
  buildAgentState,
  type BrainAgentInvocation,
  type BrainDecisionMode,
  type BrainAgentState,
} from "@/lib/ai/agent-orchestrator";

type EventSeed = {
  id: string;
  owner_id: string;
  title: string;
  event_type: string;
  event_date: string | null;
  location: string | null;
  guest_target: number | null;
  budget: number | null;
  theme: string | null;
  ai_decision_mode: BrainDecisionMode | null;
};

type PersistedAgentState = {
  event_context?: {
    event_type?: string;
    location?: string | null;
    budget?: number | null;
    guest_target?: number | null;
    theme?: string | null;
  };
};

type VendorRow = {
  id: string;
  business_name: string;
  slug: string;
  category: string;
  city: string;
  state: string | null;
  zip_code: string;
  service_radius_miles: number;
  starting_price: number | null;
  response_time_hours: number;
  is_verified: boolean;
  status: "active" | "paused" | "pending_review";
};

export type BudgetAllocation = {
  decor: number;
  food: number;
  entertainment: number;
  misc: number;
};

export type VendorMatch = {
  vendor_id: string;
  slug: string;
  business_name: string;
  category: string;
  score: number;
  recommended: boolean;
  rationale: {
    rating: number;
    price_fit: number;
    distance: number;
    availability: number;
  };
  location: string;
  starting_price: number | null;
};

export type AiBrainPlan = {
  event_id: string;
  plan_version: "ai-brain-v1";
  generated_at: string;
  complexity_score: number;
  budget_allocation: BudgetAllocation;
  timeline: Array<{ label: string; detail: string; sort_order: number }>;
  shopping_list: GeneratedShoppingItem[];
  shopping_categories: Array<{ category: string; items: Array<{ name: string; quantity: number }> }>;
  vendor_matches: VendorMatch[];
  required_vendor_categories: string[];
  agent_invocations: BrainAgentInvocation[];
  agent_state: BrainAgentState;
  replan: {
    trigger: "forced" | "context_change" | "none";
    changed_fields: string[];
    impacted_agents: string[];
  };
  handoffs: Array<{
    from: string;
    to: string[];
    reason: string;
  }>;
  proposed_actions?: Array<{
    target: "shopping" | "vendors";
    reason: string;
    impact: string;
  }>;
};

type ReplanResult = {
  trigger: "forced" | "context_change" | "none";
  changedFields: string[];
  impactedAgents: string[];
};

async function loadPreviousAgentState(supabase: SupabaseClient, eventId: string) {
  const { data } = await supabase
    .from("party_plans")
    .select("raw_response")
    .eq("event_id", eventId)
    .maybeSingle<{ raw_response?: { ai_brain?: { agent_state?: PersistedAgentState } } | null }>();
  return data?.raw_response?.ai_brain?.agent_state ?? null;
}

export function detectReplan(
  event: EventSeed,
  previousState: PersistedAgentState | null,
  forceRegenerate: boolean,
): ReplanResult {
  if (forceRegenerate) {
    return {
      trigger: "forced",
      changedFields: ["manual_force_regenerate"],
      impactedAgents: [
        "party-planning-agent",
        "invitation-card-agent",
        "shopping-recommendation-agent",
        "budget-agent",
        "task-reminder-agent",
        "rsvp-guest-agent",
        "marketplace-vendor-agent",
      ],
    };
  }

  if (!previousState?.event_context) {
    return {
      trigger: "context_change",
      changedFields: ["first_run_no_previous_state"],
      impactedAgents: [
        "party-planning-agent",
        "invitation-card-agent",
        "shopping-recommendation-agent",
        "budget-agent",
        "task-reminder-agent",
        "rsvp-guest-agent",
        "marketplace-vendor-agent",
      ],
    };
  }

  const prev = previousState.event_context;
  const changedFields: string[] = [];

  if ((prev.event_type ?? "").toLowerCase() !== event.event_type.toLowerCase()) changedFields.push("event_type");
  if ((prev.location ?? "").trim() !== (event.location ?? "").trim()) changedFields.push("location");
  if ((prev.budget ?? null) !== (event.budget ?? null)) changedFields.push("budget");
  if ((prev.guest_target ?? null) !== (event.guest_target ?? null)) changedFields.push("guest_target");
  if ((prev.theme ?? "").trim().toLowerCase() !== (event.theme ?? "").trim().toLowerCase()) changedFields.push("theme");

  if (!changedFields.length) {
    return {
      trigger: "none",
      changedFields: [],
      impactedAgents: [],
    };
  }

  const impacted = new Set<string>();
  for (const field of changedFields) {
    if (field === "event_type") {
      impacted.add("party-planning-agent");
      impacted.add("shopping-recommendation-agent");
      impacted.add("marketplace-vendor-agent");
      impacted.add("invitation-card-agent");
      impacted.add("task-reminder-agent");
    }
    if (field === "location") {
      impacted.add("marketplace-vendor-agent");
      impacted.add("task-reminder-agent");
    }
    if (field === "budget") {
      impacted.add("budget-agent");
      impacted.add("shopping-recommendation-agent");
      impacted.add("marketplace-vendor-agent");
    }
    if (field === "guest_target") {
      impacted.add("party-planning-agent");
      impacted.add("shopping-recommendation-agent");
      impacted.add("task-reminder-agent");
    }
    if (field === "theme") {
      impacted.add("party-planning-agent");
      impacted.add("invitation-card-agent");
      impacted.add("shopping-recommendation-agent");
    }
  }

  return {
    trigger: "context_change",
    changedFields,
    impactedAgents: [...impacted],
  };
}

function buildHandoffGraph() {
  return [
    {
      from: "brain-orchestrator",
      to: ["party-planning-agent"],
      reason: "Build baseline event plan context first.",
    },
    {
      from: "party-planning-agent",
      to: [
        "budget-agent",
        "shopping-recommendation-agent",
        "task-reminder-agent",
        "invitation-card-agent",
      ],
      reason: "Run core execution agents in parallel from shared plan context.",
    },
    {
      from: "budget-agent",
      to: ["shopping-recommendation-agent", "marketplace-vendor-agent"],
      reason: "Budget constraints refine shopping and vendor selections.",
    },
    {
      from: "shopping-recommendation-agent",
      to: ["marketplace-vendor-agent"],
      reason: "Shopping scope informs vendor category needs.",
    },
    {
      from: "marketplace-vendor-agent",
      to: ["vendor-onboarding-agent"],
      reason: "Vendor demand signals can drive supply-side onboarding actions.",
    },
    {
      from: "invitation-card-agent",
      to: ["rsvp-guest-agent"],
      reason: "Invite assets and RSVP wording feed guest communication workflows.",
    },
  ];
}

function estimateShoppingTotal(items: GeneratedShoppingItem[]) {
  return items.reduce((sum, item) => sum + (item.estimated_price ?? 0) * item.quantity, 0);
}

export function applyBudgetConstraintsToShopping(
  items: GeneratedShoppingItem[],
  budget: number | null,
  budgetAllocation: BudgetAllocation,
) {
  const budgetCap = budget ?? budgetAllocation.decor + budgetAllocation.food + budgetAllocation.entertainment + budgetAllocation.misc;
  if (!budgetCap || budgetCap <= 0) {
    return { items, adjusted: false, total: estimateShoppingTotal(items) };
  }

  const target = budgetCap * 0.65;
  const next = items.map((item) => ({ ...item }));
  let total = estimateShoppingTotal(next);

  if (total <= target) {
    return { items: next, adjusted: false, total };
  }

  const ranked = [...next]
    .map((item, index) => ({ index, unit: item.estimated_price ?? 0 }))
    .sort((a, b) => b.unit - a.unit);

  for (const candidate of ranked) {
    const item = next[candidate.index];
    if ((item.estimated_price ?? 0) <= 0) continue;
    while (item.quantity > 1 && total > target) {
      item.quantity -= 1;
      total -= item.estimated_price ?? 0;
    }
    if (total <= target) break;
  }

  return { items: next, adjusted: true, total };
}

export function applyBudgetConstraintsToVendors(
  matches: VendorMatch[],
  budgetAllocation: BudgetAllocation,
) {
  const vendorCap = (budgetAllocation.entertainment + budgetAllocation.misc) * 1.25;
  if (vendorCap <= 0) {
    return { matches, adjusted: false };
  }

  const affordable = matches.filter((vendor) => {
    if (vendor.starting_price == null) return true;
    return vendor.starting_price <= vendorCap;
  });

  if (!affordable.length) {
    return { matches, adjusted: false };
  }

  const reordered = [
    ...affordable,
    ...matches.filter((vendor) => !affordable.some((a) => a.vendor_id === vendor.vendor_id)),
  ].slice(0, 6);

  return { matches: reordered, adjusted: true };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function extractZip(value: string | null) {
  return value?.match(/\b\d{5}\b/)?.[0] ?? null;
}

function getVenueType(event: EventSeed) {
  const text = `${event.location ?? ""} ${event.title} ${event.theme ?? ""}`.toLowerCase();
  if (text.includes("home") || text.includes("house")) return "home";
  if (text.includes("outdoor") || text.includes("park") || text.includes("backyard")) return "outdoor";
  return "venue";
}

function getComplexityScore(event: EventSeed) {
  const guests = event.guest_target ?? 12;
  const budget = event.budget ?? 250;
  const venueType = getVenueType(event);

  const guestScore = clamp(Math.round((guests / 100) * 45), 8, 45);
  const budgetScore = clamp(Math.round((budget / 2000) * 30), 6, 30);
  const venueScore = venueType === "home" ? 10 : venueType === "outdoor" ? 18 : 15;
  const eventTypeScore = /wedding|corporate|gala/.test(event.event_type.toLowerCase()) ? 12 : 7;

  return clamp(guestScore + budgetScore + venueScore + eventTypeScore, 1, 100);
}

export function allocateBudget(event: Pick<EventSeed, "budget" | "event_type" | "guest_target" | "location">): BudgetAllocation {
  const totalBudget = event.budget ?? 0;

  const weights = {
    decor: 0.2,
    food: 0.3,
    entertainment: 0.3,
    misc: 0.2,
  };

  const type = event.event_type.toLowerCase();
  if (type.includes("birthday") || type.includes("kids")) {
    weights.entertainment += 0.05;
    weights.misc -= 0.05;
  }
  if (type.includes("wedding") || type.includes("anniversary")) {
    weights.decor += 0.05;
    weights.misc -= 0.05;
  }

  const venueType = getVenueType({
    id: "",
    owner_id: "",
    title: "",
    event_type: event.event_type,
    event_date: null,
    location: event.location,
    guest_target: event.guest_target,
    budget: event.budget,
    theme: null,
    ai_decision_mode: null,
  });
  if (venueType === "outdoor") {
    weights.misc += 0.05;
    weights.decor -= 0.05;
  }

  const raw = {
    decor: totalBudget * weights.decor,
    food: totalBudget * weights.food,
    entertainment: totalBudget * weights.entertainment,
    misc: totalBudget * weights.misc,
  };

  const allocation = {
    decor: roundMoney(raw.decor),
    food: roundMoney(raw.food),
    entertainment: roundMoney(raw.entertainment),
    misc: roundMoney(raw.misc),
  };

  const delta = roundMoney(totalBudget - (allocation.decor + allocation.food + allocation.entertainment + allocation.misc));
  allocation.misc = roundMoney(allocation.misc + delta);

  return allocation;
}

function getRequiredVendorCategories(eventType: string) {
  const type = eventType.toLowerCase();
  if (type.includes("birthday")) {
    return ["Bakery", "Decor", "DJ", "Catering"];
  }
  if (type.includes("wedding")) {
    return ["Venue", "Catering", "Photography", "Decor", "DJ"];
  }
  return ["Catering", "Decor", "DJ"];
}

function scoreVendor({
  vendor,
  rating,
  budgetAllocation,
  eventZip,
}: {
  vendor: VendorRow;
  rating: number;
  budgetAllocation: BudgetAllocation;
  eventZip: string | null;
}) {
  const budgetTarget = budgetAllocation.entertainment + budgetAllocation.misc;
  const price = vendor.starting_price ?? budgetTarget;
  const priceDelta = budgetTarget > 0 ? Math.abs(price - budgetTarget) / budgetTarget : 0.5;
  const priceFit = clamp(1 - priceDelta, 0.2, 1);

  const distance = eventZip && vendor.zip_code === eventZip ? 1 : 0.65;
  const availability = clamp(1 - ((vendor.response_time_hours - 4) / 72), 0.25, 1);
  const normalizedRating = clamp(rating / 5, 0.2, 1);

  const weighted =
    normalizedRating * 0.4 +
    priceFit * 0.3 +
    distance * 0.2 +
    availability * 0.1;

  return {
    score: Math.round(weighted * 100),
    rationale: {
      rating: Number(normalizedRating.toFixed(2)),
      price_fit: Number(priceFit.toFixed(2)),
      distance: Number(distance.toFixed(2)),
      availability: Number(availability.toFixed(2)),
    },
  };
}

async function loadEventSeed(supabase: SupabaseClient, eventId: string) {
  const [{ data: event, error: eventError }, { count: guestCount }] = await Promise.all([
    supabase
      .from("events")
      .select("id, owner_id, title, event_type, event_date, location, guest_target, budget, theme, ai_decision_mode")
      .eq("id", eventId)
      .single<EventSeed>(),
    supabase.from("guests").select("*", { count: "exact", head: true }).eq("event_id", eventId),
  ]);

  if (eventError || !event) {
    throw new Error(eventError?.message ?? "Event not found.");
  }

  return {
    ...event,
    guest_target: event.guest_target ?? guestCount ?? null,
  };
}

const FALLBACK_VENDORS: VendorMatch[] = [
  {
    vendor_id: "fallback-bakery-1",
    slug: "fallback-bakery",
    business_name: "Celebration Cake Studio",
    category: "Bakery",
    score: 84,
    recommended: true,
    rationale: { rating: 0.84, price_fit: 0.78, distance: 0.65, availability: 0.9 },
    location: "Dallas, TX",
    starting_price: 150,
  },
  {
    vendor_id: "fallback-decor-1",
    slug: "fallback-decor",
    business_name: "Party Pop Decor Co",
    category: "Decor",
    score: 82,
    recommended: true,
    rationale: { rating: 0.82, price_fit: 0.75, distance: 0.65, availability: 0.88 },
    location: "Dallas, TX",
    starting_price: 220,
  },
  {
    vendor_id: "fallback-dj-1",
    slug: "fallback-dj",
    business_name: "Good Vibes DJ",
    category: "DJ",
    score: 80,
    recommended: true,
    rationale: { rating: 0.8, price_fit: 0.72, distance: 0.65, availability: 0.86 },
    location: "Dallas, TX",
    starting_price: 500,
  },
];

export async function matchVendorsForEvent(
  supabase: SupabaseClient,
  event: Pick<EventSeed, "event_type" | "budget" | "guest_target" | "location">,
  budgetAllocation: BudgetAllocation,
) {
  const requiredCategories = getRequiredVendorCategories(event.event_type);
  const eventZip = extractZip(event.location);

  const [{ data: vendorsData }, { data: reviewsData }] = await Promise.all([
    supabase
      .from("vendors")
      .select("id, business_name, slug, category, city, state, zip_code, service_radius_miles, starting_price, response_time_hours, is_verified, status")
      .eq("status", "active")
      .limit(100)
      .returns<VendorRow[]>(),
    supabase
      .from("marketplace_reviews")
      .select("vendor_id, rating")
      .eq("status", "approved")
      .returns<Array<{ vendor_id: string | null; rating: number }>>(),
  ]);

  const vendors = vendorsData ?? [];
  if (!vendors.length) {
    return {
      requiredCategories,
      matches: FALLBACK_VENDORS,
    };
  }

  const reviewBucket = new Map<string, number[]>();
  for (const review of reviewsData ?? []) {
    if (!review.vendor_id) continue;
    const list = reviewBucket.get(review.vendor_id) ?? [];
    list.push(review.rating);
    reviewBucket.set(review.vendor_id, list);
  }

  const normalized = vendors
    .map((vendor) => {
      const ratings = reviewBucket.get(vendor.id) ?? [];
      const avgRating = ratings.length
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
        : 4.2;
      const { score, rationale } = scoreVendor({
        vendor,
        rating: avgRating,
        budgetAllocation,
        eventZip,
      });

      return {
        vendor_id: vendor.id,
        slug: vendor.slug,
        business_name: vendor.business_name,
        category: vendor.category,
        score,
        recommended: false,
        rationale,
        location: `${vendor.city}${vendor.state ? `, ${vendor.state}` : ""}`,
        starting_price: vendor.starting_price,
      } as VendorMatch;
    })
    .sort((a, b) => b.score - a.score);

  const selected: VendorMatch[] = [];
  for (const category of requiredCategories) {
    const categoryMatch = normalized.find(
      (vendor) => vendor.category.toLowerCase() === category.toLowerCase(),
    );
    if (categoryMatch) {
      selected.push({ ...categoryMatch, recommended: true });
    }
  }

  const fillCount = Math.max(0, 6 - selected.length);
  for (const extra of normalized) {
    if (fillCount === 0) break;
    if (selected.some((candidate) => candidate.vendor_id === extra.vendor_id)) continue;
    selected.push(extra);
    if (selected.length >= 6) break;
  }

  return {
    requiredCategories,
    matches: selected.slice(0, 6),
  };
}

async function logAiDecision(
  supabase: SupabaseClient,
  {
    eventId,
    module,
    decision,
  }: {
    eventId: string;
    module: string;
    decision: Record<string, unknown>;
  },
) {
  await supabase.from("ai_brain_decisions").insert({
    event_id: eventId,
    module,
    decision,
  });
}

export async function generateAiBrainPlanForEvent(
  supabase: SupabaseClient,
  eventId: string,
  options?: { forceRegenerate?: boolean; decisionMode?: BrainDecisionMode },
): Promise<AiBrainPlan> {
  const runStartedAt = Date.now();
  const event = await loadEventSeed(supabase, eventId);
  const decisionMode: BrainDecisionMode = options?.decisionMode ?? event.ai_decision_mode ?? "approve";
  const previousAgentState = await loadPreviousAgentState(supabase, eventId);
  const replan = detectReplan(event, previousAgentState, options?.forceRegenerate ?? false);
  const handoffs = buildHandoffGraph();
  const agentInvocations = buildAgentInvocationPlan({
    eventType: event.event_type,
    location: event.location,
    budget: event.budget,
    guestTarget: event.guest_target,
    theme: event.theme,
  });
  const agentState = buildAgentState(
    {
      eventType: event.event_type,
      location: event.location,
      budget: event.budget,
      guestTarget: event.guest_target,
      theme: event.theme,
    },
    agentInvocations,
    decisionMode,
  );
  const complexityScore = getComplexityScore(event);
  const budgetAllocation = allocateBudget(event);
  const { data: existingPlanSnapshot } = await supabase
    .from("party_plans")
    .select("shopping_categories, vendor_matches, required_vendor_categories")
    .eq("event_id", eventId)
    .maybeSingle<{
      shopping_categories: Array<{ category: string; items: Array<{ name: string; quantity: number }> }> | null;
      vendor_matches: VendorMatch[] | null;
      required_vendor_categories: string[] | null;
    }>();
  const shouldReplanCore =
    (options?.forceRegenerate ?? false) ||
    replan.trigger === "context_change" ||
    replan.impactedAgents.includes("party-planning-agent");
  const shouldReplanShopping = shouldReplanCore || replan.impactedAgents.includes("shopping-recommendation-agent");
  const shouldReplanVendors = shouldReplanCore || replan.impactedAgents.includes("marketplace-vendor-agent");

  const plan = await generatePlanForEvent(supabase, eventId, {
    forceRegenerate: shouldReplanCore,
  });

  const shoppingResult = shouldReplanShopping
    ? await generateShoppingListForEvent(supabase, eventId, {
      searchTerms: [event.event_type, event.theme ?? "", event.title].filter(Boolean),
    })
    : { shoppingCategories: existingPlanSnapshot?.shopping_categories ?? [] };

  const constrainedShopping = applyBudgetConstraintsToShopping(
    (plan as { shoppingItems?: GeneratedShoppingItem[] }).shoppingItems ?? [],
    event.budget,
    budgetAllocation,
  );

  const vendorResult = shouldReplanVendors
    ? await matchVendorsForEvent(supabase, event, budgetAllocation)
    : {
      requiredCategories: existingPlanSnapshot?.required_vendor_categories ?? [],
      matches: existingPlanSnapshot?.vendor_matches ?? [],
    };
  const constrainedVendors = applyBudgetConstraintsToVendors(vendorResult.matches, budgetAllocation);
  const matches = decisionMode === "full_auto" ? constrainedVendors.matches : vendorResult.matches;
  const requiredCategories = vendorResult.requiredCategories;
  const effectiveShopping = decisionMode === "full_auto" ? constrainedShopping.items : ((plan as { shoppingItems?: GeneratedShoppingItem[] }).shoppingItems ?? []);
  const proposedActions = decisionMode === "approve"
    ? [
      ...(constrainedShopping.adjusted ? [{ target: "shopping" as const, reason: "Projected shopping spend exceeds target envelope.", impact: "Reduce quantities in highest-cost items first." }] : []),
      ...(constrainedVendors.adjusted ? [{ target: "vendors" as const, reason: "Vendor starting prices exceed budget target.", impact: "Prioritize lower-cost vendor options." }] : []),
    ]
    : [];
  const agentArtifacts = {
    "vendor-onboarding-agent": {
      status: agentInvocations.some((a) => a.agent_id === "vendor-onboarding-agent" && a.status === "invoked") ? "generated" : "standby",
      recommendations: requiredCategories.map((category: string) => ({
        category,
        onboarding_priority: "high",
      })),
    },
    "social-media-agent": {
      status: "generated",
      campaign_brief: `${event.event_type} momentum content mapped from event plan sections.`,
    },
    "admin-growth-agent": {
      status: "generated",
      insight: `Event complexity ${complexityScore} with ${matches.length} vendor options and ${effectiveShopping.length} shopping items.`,
    },
  };
  const totalLatency = Date.now() - runStartedAt;
  const invokedAgents = agentInvocations.filter((a) => a.status === "invoked");
  const agentMetrics = agentInvocations.map((agent) => ({
    agent_id: agent.agent_id,
    status: agent.status,
    latency_ms: agent.status === "invoked" ? Math.max(1, Math.round(totalLatency / Math.max(1, invokedAgents.length))) : 0,
    adjustment_count: agent.status === "invoked"
      ? agent.agent_id === "shopping-recommendation-agent" && constrainedShopping.adjusted
        ? 1
        : agent.agent_id === "marketplace-vendor-agent" && constrainedVendors.adjusted
          ? 1
          : 0
      : 0,
    acceptance_signal: agent.status === "standby"
      ? "standby"
      : decisionMode === "full_auto"
        ? "auto_applied"
        : "pending_approval",
  }));

  await supabase
    .from("party_plans")
    .update({
      budget_allocation: budgetAllocation,
      vendor_matches: matches,
      complexity_score: complexityScore,
      required_vendor_categories: requiredCategories,
      raw_response: {
        ...(plan as { rawResponse?: Record<string, unknown> }).rawResponse,
        ai_brain: {
          version: "ai-brain-v1",
          one_click_generated_at: new Date().toISOString(),
          agent_invocations: agentInvocations,
          agent_state: agentState,
          replan: {
            trigger: replan.trigger,
            changed_fields: replan.changedFields,
            impacted_agents: replan.impactedAgents,
          },
          handoffs,
          proposed_actions: proposedActions,
          agent_artifacts: agentArtifacts,
          agent_metrics: agentMetrics,
        },
      },
    })
    .eq("event_id", eventId);

  await Promise.all([
    logAiDecision(supabase, {
      eventId,
      module: "budget_allocator",
      decision: {
        budget: event.budget,
        guest_target: event.guest_target,
        event_type: event.event_type,
        allocation: budgetAllocation,
      },
    }),
    logAiDecision(supabase, {
      eventId,
      module: "vendor_matching",
      decision: {
        required_categories: requiredCategories,
        top_vendor_ids: matches.map((item: VendorMatch) => item.vendor_id),
      },
    }),
    logAiDecision(supabase, {
      eventId,
      module: "complexity_scoring",
      decision: {
        complexity_score: complexityScore,
        guest_target: event.guest_target,
        budget: event.budget,
      },
    }),
    logAiDecision(supabase, {
      eventId,
      module: "agent_orchestration",
      decision: {
        invoked_agents: agentInvocations.filter((agent) => agent.status === "invoked").map((agent) => agent.agent_id),
        standby_agents: agentInvocations.filter((agent) => agent.status === "standby").map((agent) => agent.agent_id),
        agent_state: agentState,
        replan: {
          trigger: replan.trigger,
          changed_fields: replan.changedFields,
          impacted_agents: replan.impactedAgents,
        },
        handoffs,
        decision_mode: decisionMode,
      },
    }),
    logAiDecision(supabase, {
      eventId,
      module: "handoff_snapshots",
      decision: {
        handoff_graph: handoffs,
        input_snapshot: {
          event_type: event.event_type,
          budget: event.budget,
          guest_target: event.guest_target,
          location: event.location,
          theme: event.theme,
          replan_trigger: replan.trigger,
          changed_fields: replan.changedFields,
        },
        output_snapshot: {
          complexity_score: complexityScore,
          vendor_count: matches.length,
          shopping_items: constrainedShopping.items.length,
          shopping_estimated_total: constrainedShopping.total,
          budget_adjusted_shopping: constrainedShopping.adjusted,
          budget_adjusted_vendors: constrainedVendors.adjusted,
          decision_mode: decisionMode,
        },
      },
    }),
    logAiDecision(supabase, {
      eventId,
      module: "agent_quality_metrics",
      decision: {
        metrics: agentMetrics,
        total_latency_ms: totalLatency,
      },
    }),
    logAiDecision(supabase, {
      eventId,
      module: "agent_artifacts",
      decision: agentArtifacts as Record<string, unknown>,
    }),
  ]);

  return {
    event_id: eventId,
    plan_version: "ai-brain-v1",
    generated_at: new Date().toISOString(),
    complexity_score: complexityScore,
    budget_allocation: budgetAllocation,
    timeline: plan.timeline,
    shopping_list: effectiveShopping,
    shopping_categories: shoppingResult.shoppingCategories,
    vendor_matches: matches,
    required_vendor_categories: requiredCategories,
    agent_invocations: agentInvocations,
    agent_state: agentState,
    replan: {
      trigger: replan.trigger,
      changed_fields: replan.changedFields,
      impacted_agents: replan.impactedAgents,
    },
    handoffs,
    proposed_actions: proposedActions,
  };
}
