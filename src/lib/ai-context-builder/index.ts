import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildEventIntelligenceContext,
  loadEventAnswers,
} from "@/features/event-intelligence/services/event-intelligence";

export async function buildAiContextForEvent(supabase: SupabaseClient, eventId: string) {
  const { data: event, error } = await supabase
    .from("events")
    .select("id, event_type, guest_target")
    .eq("id", eventId)
    .single<{ id: string; event_type: string; guest_target: number | null }>();

  if (error || !event) {
    throw new Error(error?.message ?? "Event not found.");
  }

  const answers = await loadEventAnswers(supabase, eventId);
  return buildEventIntelligenceContext({
    eventType: event.event_type,
    guestTarget: event.guest_target,
    answers,
  });
}
