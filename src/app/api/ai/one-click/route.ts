import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceAiLimits } from "@/lib/ai/limits";
import { generateAiBrainPlanForEvent } from "@/lib/ai/brain";
import { isFeatureFlagEnabled } from "@/lib/feature-flags";
import { guardWithTurnstile } from "@/lib/security/turnstile";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAuditLog, trackAnalyticsEvent } from "@/lib/telemetry";

const bodySchema = z.object({
  eventId: z.string().uuid(),
  forceRegenerate: z.boolean().optional(),
  turnstileToken: z.string().trim().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? "Invalid one-click payload." }, { status: 400 });
  }

  const turnstile = await guardWithTurnstile({
    token: parsed.data.turnstileToken,
    headers: request.headers,
    context: "ai:one-click",
  });

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
    generationType: "party_plan",
  });

  if (!limit.allowed) {
    return NextResponse.json({ ok: false, message: limit.message }, { status: 429 });
  }

  try {
    const plan = await generateAiBrainPlanForEvent(supabase, parsed.data.eventId, {
      forceRegenerate: parsed.data.forceRegenerate ?? false,
    });

    await Promise.all([
      trackAnalyticsEvent(supabase, {
        eventName: "ai_plan_generated",
        userId: user.id,
        eventId: parsed.data.eventId,
        metadata: {
          complexity_score: plan.complexity_score,
          vendor_matches: plan.vendor_matches.length,
          shopping_items: plan.shopping_list.length,
        },
      }),
      createAuditLog(supabase, {
        action: "ai_plan_generated",
        userId: user.id,
        eventId: parsed.data.eventId,
        metadata: {
          complexity_score: plan.complexity_score,
          plan_version: plan.plan_version,
        },
      }),
    ]);

    return NextResponse.json({ ok: true, ...plan });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "Unable to run one-click party." }, { status: 400 });
  }
}
