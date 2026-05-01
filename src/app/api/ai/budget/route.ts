import { NextResponse } from "next/server";
import { z } from "zod";
import { allocateBudget } from "@/lib/ai/brain";
import { guardWithTurnstile } from "@/lib/security/turnstile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  eventId: z.string().uuid(),
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
  await supabase.from("party_plans").update({ budget_allocation: budgetAllocation }).eq("event_id", parsed.data.eventId);

  return NextResponse.json({ ok: true, event_id: parsed.data.eventId, budget_allocation: budgetAllocation });
}
