import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceAiLimits } from "@/lib/ai/limits";
import { generateInviteCopyForEvent } from "@/lib/ai/workflows";
import { isFeatureFlagEnabled } from "@/lib/feature-flags";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  eventId: z.string().uuid(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: parsed.error.issues[0]?.message ?? "Invalid invite generation payload.",
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
  const aiGenerationEnabled = await isFeatureFlagEnabled("ai_generation", {
    userId: user.id,
    fallbackEnabled: true,
  });

  if (!aiGenerationEnabled) {
    return NextResponse.json(
      { ok: false, message: "AI generation is temporarily unavailable." },
      { status: 503 },
    );
  }

  const limit = await enforceAiLimits(supabase, {
    userId: user.id,
    eventId: parsed.data.eventId,
    generationType: "invitation_text",
  });

  if (!limit.allowed) {
    return NextResponse.json({ ok: false, message: limit.message }, { status: 429 });
  }

  try {
    const result = await generateInviteCopyForEvent(supabase, parsed.data.eventId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to generate invite copy.",
      },
      { status: 400 },
    );
  }
}
