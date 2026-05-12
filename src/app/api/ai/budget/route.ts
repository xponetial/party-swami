import { NextResponse } from "next/server";
import { z } from "zod";
import { allocateBudget } from "@/lib/ai/brain";
import { guardWithTurnstile } from "@/lib/security/turnstile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  eventId: z.string().uuid(),
  decisionMode: z.enum(["approve", "full_auto"]).optional(),
  turnstileToken: z.string().trim().min(1),
});

type EventSeed = {
  event_type: string;
  budget: number | null;
  guest_target: number | null;
  location: string | null;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid budget payload." }, { status: 400 });
  }

  const turnstile = await guardWithTurnstile({ token: parsed.data.turnstileToken, headers: request.headers, context: "ai:budget" });

  if (!turnstile.ok) {
    return NextResponse.json({ ok: false, message: turnstile.message }, { status: turnstile.status });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "You must be signed in." }, { status: 401 });
  }

  const { data: event, error } = await supabase
    .from("events")
    .select("event_type, budget, guest_target, location")
    .eq("id", parsed.data.eventId)
    .eq("owner_id", user.id)
    .single<EventSeed>();

  if (error || !event) {
    return NextResponse.json({ ok: false, message: error?.message ?? "Event not found." }, { status: 404 });
  }

  const budgetAllocation = allocateBudget(event);
  const { data: existingPlan } = await supabase
    .from("party_plans")
    .select("raw_response")
    .eq("event_id", parsed.data.eventId)
    .maybeSingle<{ raw_response?: Record<string, unknown> | null }>();
  const currentRaw = (existingPlan?.raw_response ?? {}) as Record<string, unknown>;
  const currentAiBrain = ((currentRaw.ai_brain ?? {}) as Record<string, unknown>);
  await supabase.from("party_plans").update({
    budget_allocation: budgetAllocation,
    raw_response: {
      ...currentRaw,
      ai_brain: {
        ...currentAiBrain,
        budget_rationale: {
          decision_mode: parsed.data.decisionMode ?? "approve",
          event_budget: event.budget,
          allocation: budgetAllocation,
        },
      },
    },
  }).eq("event_id", parsed.data.eventId);

  return NextResponse.json({ ok: true, event_id: parsed.data.eventId, budget_allocation: budgetAllocation });
}
