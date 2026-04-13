import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type FeatureFlagRow = {
  key: string;
  enabled: boolean;
  rollout_percentage: number;
};

function normalizedRollout(value: number) {
  return Math.max(0, Math.min(100, Math.trunc(value)));
}

function isIncludedInRollout(userId: string, rolloutPercentage: number) {
  let hash = 0;

  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash * 31 + userId.charCodeAt(index)) % 100;
  }

  return hash < rolloutPercentage;
}

export async function isFeatureFlagEnabled(
  key: string,
  options?: {
    userId?: string | null;
    fallbackEnabled?: boolean;
  },
) {
  const fallbackEnabled = options?.fallbackEnabled ?? true;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("feature_flags")
    .select("key, enabled, rollout_percentage")
    .eq("key", key)
    .maybeSingle<FeatureFlagRow>();

  if (error?.code === "42P01") {
    return fallbackEnabled;
  }

  if (error) {
    throw new Error(`Unable to load feature flag ${key}: ${error.message}`);
  }

  if (!data) {
    return fallbackEnabled;
  }

  if (!data.enabled) {
    return false;
  }

  const rolloutPercentage = normalizedRollout(data.rollout_percentage);
  if (rolloutPercentage >= 100) {
    return true;
  }

  if (rolloutPercentage <= 0) {
    return false;
  }

  const userId = options?.userId;
  if (!userId) {
    return false;
  }

  return isIncludedInRollout(userId, rolloutPercentage);
}

