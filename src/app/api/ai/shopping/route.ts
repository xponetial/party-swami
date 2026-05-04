import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceAiLimits } from "@/lib/ai/limits";
import { generateShoppingListForEvent } from "@/lib/ai/workflows";
import { isFeatureFlagEnabled } from "@/lib/feature-flags";
import { guardWithTurnstile } from "@/lib/security/turnstile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  eventId: z.string().uuid(),
  searchTerms: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
  budgetEnvelope: z.number().positive().optional(),
  turnstileToken: z.string().trim().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid shopping payload." }, { status: 400 });
  }

  const turnstile = await guardWithTurnstile({ token: parsed.data.turnstileToken, headers: request.headers, context: "ai:shopping" });

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

  const aiGenerationEnabled = await isFeatureFlagEnabled("ai_generation", {
    userId: user.id,
    fallbackEnabled: true,
  });

  if (!aiGenerationEnabled) {
    return NextResponse.json({ ok: false, message: "AI generation is temporarily unavailable." }, { status: 503 });
  }

  const limit = await enforceAiLimits(supabase, {
    userId: user.id,
    eventId: parsed.data.eventId,
    generationType: "shopping_list_transform",
  });

  if (!limit.allowed) {
    return NextResponse.json({ ok: false, message: limit.message }, { status: 429 });
  }

  try {
    const result = await generateShoppingListForEvent(supabase, parsed.data.eventId, {
      searchTerms: parsed.data.searchTerms ?? [],
    });
    await supabase.from("ai_brain_decisions").insert({
      event_id: parsed.data.eventId,
      module: "shopping_budget_envelope",
      decision: {
        budget_envelope: parsed.data.budgetEnvelope ?? null,
        generated_categories: result.shoppingCategories.length,
      },
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to generate shopping list." }, { status: 400 });
  }
}
