import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceAiLimits } from "@/lib/ai/limits";
import { generateInviteBackgroundImageOptions } from "@/lib/ai/invite-image";
import { isFeatureFlagEnabled } from "@/lib/feature-flags";
import { uploadInviteGeneratedImageOption } from "@/lib/invite-preview-storage";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  eventId: z.string().uuid(),
  inviteId: z.string().uuid(),
  prompt: z.string().trim().min(8).max(500),
  optionCount: z.number().int().min(1).max(3).optional(),
});

function monthBucket() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

async function trackInviteImageGeneration({
  supabase,
  userId,
  eventId,
  model,
  fingerprint,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
  eventId: string;
  model: string;
  fingerprint: string;
}) {
  await supabase.from("ai_generations").insert({
    user_id: userId,
    event_id: eventId,
    generation_type: "invitation_text",
    model,
    request_fingerprint: fingerprint,
    prompt_version: "invite-image-v1",
    input_tokens: 0,
    output_tokens: 0,
    cached_input_tokens: 0,
    estimated_cost_usd: 0,
    latency_ms: null,
    status: "success",
  });

  const usageMonth = monthBucket();
  const { data: existingUsage } = await supabase
    .from("user_usage_monthly")
    .select("id, requests_count, input_tokens, output_tokens, cached_input_tokens, estimated_cost_usd")
    .eq("user_id", userId)
    .eq("usage_month", usageMonth)
    .maybeSingle<{
      id: string;
      requests_count: number;
      input_tokens: number;
      output_tokens: number;
      cached_input_tokens: number;
      estimated_cost_usd: number;
    }>();

  const payload = {
    user_id: userId,
    usage_month: usageMonth,
    requests_count: (existingUsage?.requests_count ?? 0) + 1,
    input_tokens: existingUsage?.input_tokens ?? 0,
    output_tokens: existingUsage?.output_tokens ?? 0,
    cached_input_tokens: existingUsage?.cached_input_tokens ?? 0,
    estimated_cost_usd: Number((existingUsage?.estimated_cost_usd ?? 0).toFixed(6)),
  };

  if (existingUsage) {
    await supabase.from("user_usage_monthly").update(payload).eq("id", existingUsage.id);
    return;
  }

  await supabase.from("user_usage_monthly").insert(payload);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid image payload." },
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

  const [{ data: profile }, aiGenerationEnabled, uploadEditingEnabled] = await Promise.all([
    supabase
      .from("profiles")
      .select("plan_tier")
      .eq("id", user.id)
      .maybeSingle<{ plan_tier: string | null }>(),
    isFeatureFlagEnabled("ai_generation", { userId: user.id, fallbackEnabled: true }),
    isFeatureFlagEnabled("upload_editing", { userId: user.id, fallbackEnabled: false }),
  ]);

  if (!aiGenerationEnabled || !uploadEditingEnabled) {
    return NextResponse.json(
      { ok: false, message: "AI image generation is temporarily unavailable." },
      { status: 503 },
    );
  }

  const isPaidPlan = profile?.plan_tier === "pro" || profile?.plan_tier === "admin";

  if (!isPaidPlan) {
    return NextResponse.json(
      { ok: false, message: "AI image generation is available on Pro and Admin plans." },
      { status: 403 },
    );
  }

  const [{ data: ownedEvent }, { data: inviteRow }] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, event_type")
      .eq("id", parsed.data.eventId)
      .eq("owner_id", user.id)
      .maybeSingle<{ id: string; title: string; event_type: string }>(),
    supabase
      .from("invites")
      .select("id")
      .eq("id", parsed.data.inviteId)
      .eq("event_id", parsed.data.eventId)
      .maybeSingle<{ id: string }>(),
  ]);

  if (!ownedEvent || !inviteRow) {
    return NextResponse.json({ ok: false, message: "Invite not found." }, { status: 404 });
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
    const fingerprint = crypto
      .createHash("sha256")
      .update(
        JSON.stringify({
          eventId: parsed.data.eventId,
          inviteId: parsed.data.inviteId,
          prompt: parsed.data.prompt.trim().toLowerCase(),
        }),
      )
      .digest("hex");
    const generationPrompt = `Create a festive 2:3 vertical invitation background image for "${ownedEvent.title}" (${ownedEvent.event_type}). Style request: ${parsed.data.prompt}. No readable text. Keep center areas usable for overlay typography.`;
    const generated = await generateInviteBackgroundImageOptions(
      generationPrompt,
      parsed.data.optionCount ?? 3,
    );
    const options = await Promise.all(
      generated.pngs.slice(0, parsed.data.optionCount ?? 3).map((png, index) =>
        uploadInviteGeneratedImageOption({
          userId: user.id,
          eventId: parsed.data.eventId,
          inviteId: parsed.data.inviteId,
          optionIndex: index,
          png,
        }),
      ),
    );

    await trackInviteImageGeneration({
      supabase,
      userId: user.id,
      eventId: parsed.data.eventId,
      model: generated.model,
      fingerprint,
    });

    return NextResponse.json({
      ok: true,
      options: options.map((option, index) => ({
        id: `option-${index + 1}`,
        previewUrl: option.previewUrl,
        previewPath: option.previewPath,
      })),
      message: "Generated 3 invite background options.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to generate invite image.",
      },
      { status: 400 },
    );
  }
}
