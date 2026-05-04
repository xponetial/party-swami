import { NextResponse } from "next/server";
import { z } from "zod";
import { allocateBudget, matchVendorsForEvent } from "@/lib/ai/brain";
import { guardWithTurnstile } from "@/lib/security/turnstile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  eventId: z.string().uuid(),
  budgetEnvelope: z.number().positive().optional(),
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
    return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid vendors payload." }, { status: 400 });
  }

  const turnstile = await guardWithTurnstile({ token: parsed.data.turnstileToken, headers: request.headers, context: "ai:vendors" });

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

  try {
    const budget = allocateBudget(event);
    const vendorResult = await matchVendorsForEvent(supabase, event, budget);
    await supabase.from("party_plans").update({ vendor_matches: vendorResult.matches }).eq("event_id", parsed.data.eventId);
    await supabase.from("ai_brain_decisions").insert({
      event_id: parsed.data.eventId,
      module: "vendor_budget_refinement",
      decision: {
        budget_envelope: parsed.data.budgetEnvelope ?? null,
        required_categories: vendorResult.requiredCategories,
        match_count: vendorResult.matches.length,
      },
    });

    return NextResponse.json({
      ok: true,
      event_id: parsed.data.eventId,
      budget_allocation: budget,
      required_vendor_categories: vendorResult.requiredCategories,
      vendor_matches: vendorResult.matches,
    });
  } catch (vendorError) {
    return NextResponse.json({ ok: false, message: vendorError instanceof Error ? vendorError.message : "Unable to match vendors." }, { status: 400 });
  }
}
