import { SupabaseClient } from "@supabase/supabase-js";
import { getLimitsForTier, type PlanTier } from "@/lib/ai/limits";

export type MonthlyUsageSummary = {
  usageMonth: string;
  requestsCount: number;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  estimatedCostUsd: number;
};

export type GenerationSummary = {
  id: string;
  generationType: string;
  model: string;
  status: string;
  estimatedCostUsd: number;
  createdAt: string;
};

function currentMonthBucket() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

export async function getAiUsageForUser(supabase: SupabaseClient, userId: string) {
  const usageMonth = currentMonthBucket();

  const [{ data: profile }, { data: monthly }, { data: recentGenerations = [] }] = await Promise.all([
    supabase
      .from("profiles")
      .select("plan_tier")
      .eq("id", userId)
      .maybeSingle<{ plan_tier: PlanTier | null }>(),
    supabase
      .from("user_usage_monthly")
      .select(
        "usage_month, requests_count, input_tokens, output_tokens, cached_input_tokens, estimated_cost_usd",
      )
      .eq("user_id", userId)
      .eq("usage_month", usageMonth)
      .maybeSingle<{
        usage_month: string;
        requests_count: number;
        input_tokens: number;
        output_tokens: number;
        cached_input_tokens: number;
        estimated_cost_usd: number;
      }>(),
    supabase
      .from("ai_generations")
      .select("id, generation_type, model, status, estimated_cost_usd, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<
        Array<{
          id: string;
          generation_type: string;
          model: string;
          status: string;
          estimated_cost_usd: number;
          created_at: string;
        }>
      >(),
  ]);

  const planTier = profile?.plan_tier ?? "free";
  const limits = getLimitsForTier(planTier);

  const summary: MonthlyUsageSummary = {
    usageMonth,
    requestsCount: monthly?.requests_count ?? 0,
    inputTokens: monthly?.input_tokens ?? 0,
    outputTokens: monthly?.output_tokens ?? 0,
    cachedInputTokens: monthly?.cached_input_tokens ?? 0,
    estimatedCostUsd: monthly?.estimated_cost_usd ?? 0,
  };

  const cacheReuseRate =
    summary.inputTokens > 0
      ? Math.round((summary.cachedInputTokens / summary.inputTokens) * 100)
      : 0;

  const recent: GenerationSummary[] = (recentGenerations ?? []).map((generation) => ({
    id: generation.id,
    generationType: generation.generation_type,
    model: generation.model,
    status: generation.status,
    estimatedCostUsd: generation.estimated_cost_usd,
    createdAt: generation.created_at,
  }));

  return {
    planTier,
    limits,
    monthly: summary,
    remaining: {
      requests: Math.max(0, limits.monthlyRequests - summary.requestsCount),
      costUsd: Math.max(0, Number((limits.monthlyCostUsd - summary.estimatedCostUsd).toFixed(6))),
    },
    cacheReuseRate,
    recent,
  };
}
