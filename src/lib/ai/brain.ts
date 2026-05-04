import { SupabaseClient } from "@supabase/supabase-js";
import { type GeneratedShoppingItem } from "@/lib/ai/party-genie";
import { generatePlanForEvent, generateShoppingListForEvent } from "@/lib/ai/workflows";
import { buildAgentInvocationPlan, type BrainAgentInvocation } from "@/lib/ai/agent-orchestrator";

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
};

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
      .select("id, owner_id, title, event_type, event_date, location, guest_target, budget, theme")
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
  options?: { forceRegenerate?: boolean },
): Promise<AiBrainPlan> {
  const event = await loadEventSeed(supabase, eventId);
  const agentInvocations = buildAgentInvocationPlan({
    eventType: event.event_type,
    location: event.location,
  });
  const complexityScore = getComplexityScore(event);
  const budgetAllocation = allocateBudget(event);

  const plan = await generatePlanForEvent(supabase, eventId, {
    forceRegenerate: options?.forceRegenerate ?? false,
  });

  const shoppingResult = await generateShoppingListForEvent(supabase, eventId, {
    searchTerms: [event.event_type, event.theme ?? "", event.title].filter(Boolean),
  });

  const { matches, requiredCategories } = await matchVendorsForEvent(supabase, event, budgetAllocation);

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
        top_vendor_ids: matches.map((item) => item.vendor_id),
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
      },
    }),
  ]);

  return {
    event_id: eventId,
    plan_version: "ai-brain-v1",
    generated_at: new Date().toISOString(),
    complexity_score: complexityScore,
    budget_allocation: budgetAllocation,
    timeline: plan.timeline,
    shopping_list: (plan as { shoppingItems?: GeneratedShoppingItem[] }).shoppingItems ?? [],
    shopping_categories: shoppingResult.shoppingCategories,
    vendor_matches: matches,
    required_vendor_categories: requiredCategories,
    agent_invocations: agentInvocations,
  };
}
