import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceAiLimits } from "@/lib/ai/limits";
import { generatePlanForEvent } from "@/lib/ai/workflows";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAuditLog, trackAnalyticsEvent } from "@/lib/telemetry";

const bodySchema = z.object({
  eventId: z.string().uuid(),
  forceRegenerate: z.boolean().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: parsed.error.issues[0]?.message ?? "Invalid AI plan payload.",
      },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "You must be signed in." }, { status: 401 });
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
    const plan = await generatePlanForEvent(supabase, parsed.data.eventId, {
      forceRegenerate: parsed.data.forceRegenerate ?? false,
    });
    await Promise.all([
      trackAnalyticsEvent(supabase, {
        eventName: "ai_plan_generated",
        userId: user.id,
        eventId: parsed.data.eventId,
        metadata: {
          cache_hit: plan.synced?.cacheHit ?? false,
          force_regenerate: parsed.data.forceRegenerate ?? false,
          tasks_added: plan.synced?.tasksAdded ?? 0,
          shopping_items_added: plan.synced?.shoppingItemsAdded ?? 0,
        },
      }),
      createAuditLog(supabase, {
        action: "ai_plan_generated",
        userId: user.id,
        eventId: parsed.data.eventId,
        metadata: {
          cache_hit: plan.synced?.cacheHit ?? false,
          force_regenerate: parsed.data.forceRegenerate ?? false,
        },
      }),
    ]);
    return NextResponse.json({ ok: true, plan });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to generate plan.",
      },
      { status: 400 },
    );
  }
}
