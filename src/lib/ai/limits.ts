import { SupabaseClient } from "@supabase/supabase-js";

export type PlanTier = "free" | "pro" | "admin";
type GenerationType = "party_plan" | "plan_revision" | "invitation_text" | "shopping_list_transform";

type LimitDecision = {
  allowed: boolean;
  message?: string;
};

export const DEFAULT_LIMITS: Record<
  PlanTier,
  { monthlyRequests: number; monthlyCostUsd: number; planRequestsPerEvent: number }
> = {
  free: { monthlyRequests: 50, monthlyCostUsd: 1.5, planRequestsPerEvent: 5 },
  pro: { monthlyRequests: 500, monthlyCostUsd: 25, planRequestsPerEvent: 50 },
  admin: { monthlyRequests: 10000, monthlyCostUsd: 1000, planRequestsPerEvent: 1000 },
};

function monthBucket() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

export function getLimitsForTier(tier: PlanTier) {
  return DEFAULT_LIMITS[tier];
}

export async function enforceAiLimits(
  supabase: SupabaseClient,
  {
    userId,
    eventId,
    generationType,
  }: {
    userId: string;
    eventId: string;
    generationType: GenerationType;
  },
): Promise<LimitDecision> {
  const usageMonth = monthBucket();

  const [{ data: profile }, { data: usage }, { count: eventPlanCount = 0 }] = await Promise.all([
    supabase
      .from("profiles")
      .select("plan_tier")
      .eq("id", userId)
      .maybeSingle<{ plan_tier: PlanTier | null }>(),
    supabase
      .from("user_usage_monthly")
      .select("requests_count, estimated_cost_usd")
      .eq("user_id", userId)
      .eq("usage_month", usageMonth)
      .maybeSingle<{ requests_count: number; estimated_cost_usd: number }>(),
    supabase
      .from("ai_generations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("event_id", eventId)
      .in("generation_type", ["party_plan", "plan_revision"]),
  ]);

  const tier = profile?.plan_tier ?? "free";
  const limits = DEFAULT_LIMITS[tier];

  if ((usage?.requests_count ?? 0) >= limits.monthlyRequests) {
    return {
      allowed: false,
      message: "You have reached this month's AI request limit for your current plan.",
    };
  }

  if ((usage?.estimated_cost_usd ?? 0) >= limits.monthlyCostUsd) {
    return {
      allowed: false,
      message: "You have reached this month's AI usage budget for your current plan.",
    };
  }

  if (
    (generationType === "party_plan" || generationType === "plan_revision") &&
    (eventPlanCount ?? 0) >= limits.planRequestsPerEvent
  ) {
    return {
      allowed: false,
      message: "This event has reached the AI planning limit for your current plan.",
    };
  }

  return { allowed: true };
}
