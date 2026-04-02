import type { SupabaseClient } from "@supabase/supabase-js";
import { ANALYTICS_EVENTS } from "@/lib/constants";

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

export async function trackAnalyticsEvent(
  supabase: SupabaseClient,
  {
    eventName,
    userId,
    eventId,
    metadata,
  }: {
    eventName: AnalyticsEventName;
    userId?: string | null;
    eventId?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await supabase.from("analytics_events").insert({
    user_id: userId ?? null,
    event_id: eventId ?? null,
    event_name: eventName,
    metadata: metadata ?? {},
  });

  if (error) {
    console.error("Failed to track analytics event", {
      eventName,
      eventId,
      userId,
      code: error.code,
    });
  }
}

export async function createAuditLog(
  supabase: SupabaseClient,
  {
    action,
    userId,
    eventId,
    metadata,
  }: {
    action: string;
    userId?: string | null;
    eventId?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await supabase.from("audit_logs").insert({
    user_id: userId ?? null,
    event_id: eventId ?? null,
    action,
    metadata: metadata ?? {},
  });

  if (error) {
    console.error("Failed to create audit log", {
      action,
      eventId,
      userId,
      code: error.code,
    });
  }
}
