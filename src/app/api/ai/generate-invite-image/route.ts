import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceAiLimits } from "@/lib/ai/limits";
import {
  buildPartySwamiInviteImagePrompt,
  sanitizeInviteImagePrompt,
} from "@/lib/ai/invite-image-policy";
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

type InviteImageHardCaps = {
  maxImagesPerRequest: number;
  maxImagesPerDay: number;
  maxImagesPerMonth: number;
  maxMonthlyCostUsd: number;
};

type InviteImageAllowance = {
  additional_images: number;
  additional_budget_usd: number;
} | null;

const INVITE_IMAGE_DEFAULT_CAPS: Record<"pro" | "admin", InviteImageHardCaps> = {
  pro: {
    maxImagesPerRequest: 3,
    maxImagesPerDay: 30,
    maxImagesPerMonth: 30,
    maxMonthlyCostUsd: 10,
  },
  admin: {
    maxImagesPerRequest: 3,
    maxImagesPerDay: 500,
    maxImagesPerMonth: 5000,
    maxMonthlyCostUsd: 250,
  },
};

function readNumberEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function readInviteImageRequestCostUsd() {
  return readNumberEnv("OPENAI_INVITE_IMAGE_COST_PER_REQUEST_USD", 0.86);
}

function getInviteImageCaps(planTier: "pro" | "admin"): InviteImageHardCaps {
  const defaults = INVITE_IMAGE_DEFAULT_CAPS[planTier];
  const prefix = `INVITE_IMAGE_${planTier.toUpperCase()}`;

  return {
    maxImagesPerRequest: Math.max(
      1,
      Math.min(3, readNumberEnv(`${prefix}_MAX_IMAGES_PER_REQUEST`, defaults.maxImagesPerRequest)),
    ),
    maxImagesPerDay: readNumberEnv(`${prefix}_MAX_IMAGES_PER_DAY`, defaults.maxImagesPerDay),
    maxImagesPerMonth: readNumberEnv(`${prefix}_MAX_IMAGES_PER_MONTH`, defaults.maxImagesPerMonth),
    maxMonthlyCostUsd: readNumberEnv(`${prefix}_MAX_MONTHLY_COST_USD`, defaults.maxMonthlyCostUsd),
  };
}

async function enforceInviteImageHardCaps({
  supabase,
  userId,
  tier,
  requestedImageCount,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
  tier: "pro" | "admin";
  requestedImageCount: number;
}) {
  const caps = getInviteImageCaps(tier);
  const usageMonth = monthBucket();

  if (requestedImageCount > caps.maxImagesPerRequest) {
    return {
      allowed: false,
      code: "max_per_request",
      message: `Image generation is capped at ${caps.maxImagesPerRequest} options per request.`,
    };
  }

  const now = new Date();
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  const [{ data: dayRows }, { data: monthRows }, { data: allowance }] = await Promise.all([
    supabase
      .from("ai_generations")
      .select("output_tokens")
      .eq("user_id", userId)
      .eq("generation_type", "invitation_image")
      .eq("status", "success")
      .gte("created_at", dayStart),
    supabase
      .from("ai_generations")
      .select("output_tokens, estimated_cost_usd")
      .eq("user_id", userId)
      .eq("generation_type", "invitation_image")
      .eq("status", "success")
      .gte("created_at", monthStart),
    supabase
      .from("user_image_monthly_allowances")
      .select("additional_images, additional_budget_usd")
      .eq("user_id", userId)
      .eq("usage_month", usageMonth)
      .maybeSingle<InviteImageAllowance>(),
  ]);

  const dayImages = (dayRows ?? []).reduce((sum, row) => sum + Math.max(Number(row.output_tokens ?? 0), 0), 0);
  const monthImages = (monthRows ?? []).reduce(
    (sum, row) => sum + Math.max(Number(row.output_tokens ?? 0), 0),
    0,
  );
  const requestCostUsd = readInviteImageRequestCostUsd();
  const additionalImagesPurchased = Math.max(0, Number(allowance?.additional_images ?? 0));
  const additionalBudgetUsd = Math.max(0, Number(allowance?.additional_budget_usd ?? 0));
  const effectiveMonthlyImageCap = caps.maxImagesPerMonth + additionalImagesPurchased;
  const effectiveMonthlyCostCap = Number((caps.maxMonthlyCostUsd + additionalBudgetUsd).toFixed(2));
  const monthCost = (monthRows ?? []).reduce(
    (sum, row) => sum + Math.max(Number(row.estimated_cost_usd ?? 0), requestCostUsd),
    0,
  );

  if (dayImages + requestedImageCount > caps.maxImagesPerDay) {
    return {
      allowed: false,
      code: "daily_cap_reached",
      message: `Daily image cap reached (${caps.maxImagesPerDay}). Try again tomorrow.`,
    };
  }

  if (monthImages + requestedImageCount > effectiveMonthlyImageCap) {
    return {
      allowed: false,
      code: "monthly_cap_reached",
      message:
        additionalImagesPurchased > 0
          ? `Monthly image cap reached (${effectiveMonthlyImageCap}).`
          : `Monthly image cap reached (${caps.maxImagesPerMonth}). Purchase a $10 image pack to unlock more images.`,
    };
  }

  if (monthCost >= effectiveMonthlyCostCap) {
    return {
      allowed: false,
      code: "monthly_budget_reached",
      message: "Monthly image generation budget has been reached for your plan.",
    };
  }

  return { allowed: true, caps };
}

function estimateInviteImageCostUsd() {
  // Temporary business rule: treat every invite-image generation request as a flat $0.86 cost.
  // This keeps in-app budgeting aligned with observed spend until full cost reconciliation is in place.
  return Number(readInviteImageRequestCostUsd().toFixed(6));
}

async function trackInviteImageGeneration({
  supabase,
  userId,
  eventId,
  model,
  fingerprint,
  acceptedCount,
  rejectedForText,
  estimatedCostUsd,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
  eventId: string;
  model: string;
  fingerprint: string;
  acceptedCount: number;
  rejectedForText: number;
  estimatedCostUsd: number;
}) {
  await supabase.from("ai_generations").insert({
    user_id: userId,
    event_id: eventId,
    generation_type: "invitation_image",
    model,
    request_fingerprint: fingerprint,
    prompt_version: "invite-image-v2",
    input_tokens: 0,
    output_tokens: acceptedCount,
    cached_input_tokens: rejectedForText,
    estimated_cost_usd: estimatedCostUsd,
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
    output_tokens: (existingUsage?.output_tokens ?? 0) + acceptedCount,
    cached_input_tokens: (existingUsage?.cached_input_tokens ?? 0) + rejectedForText,
    estimated_cost_usd: Number(((existingUsage?.estimated_cost_usd ?? 0) + estimatedCostUsd).toFixed(6)),
  };

  if (existingUsage) {
    await supabase.from("user_usage_monthly").update(payload).eq("id", existingUsage.id);
    return;
  }

  await supabase.from("user_usage_monthly").insert(payload);
}

async function storeInviteImageOptions({
  supabase,
  userId,
  eventId,
  inviteId,
  options,
  perImageEstimatedCostUsd,
  promptExcerpt,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
  eventId: string;
  inviteId: string;
  options: Array<{
    sourcePath: string;
    sourceUrl: string;
    sourceWidth: number;
    sourceHeight: number;
  }>;
  perImageEstimatedCostUsd: number;
  promptExcerpt: string;
}) {
  if (!options.length) return;

  const { error } = await supabase.from("invite_generated_images").insert(
    options.map((option) => ({
      user_id: userId,
      event_id: eventId,
      invite_id: inviteId,
      status: "option",
      storage_path: option.sourcePath,
      public_url: option.sourceUrl,
      width: option.sourceWidth,
      height: option.sourceHeight,
      estimated_cost_usd: perImageEstimatedCostUsd,
      prompt_excerpt: promptExcerpt,
    })),
  );

  if (error) {
    console.error("Failed to persist invite image library records", {
      userId,
      eventId,
      inviteId,
      message: error.message,
    });
  }
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

  const planTier = profile?.plan_tier === "admin" ? "admin" : "pro";
  const requestedOptionCount = parsed.data.optionCount ?? 3;

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
    generationType: "invitation_image",
  });

  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        code: "ai_request_limit_reached",
        message: limit.message,
      },
      { status: 429 },
    );
  }

  const imageCaps = await enforceInviteImageHardCaps({
    supabase,
    userId: user.id,
    tier: planTier,
    requestedImageCount: requestedOptionCount,
  });

  if (!imageCaps.allowed) {
    return NextResponse.json(
      {
        ok: false,
        code: imageCaps.code ?? "invite_image_limit_reached",
        message: imageCaps.message,
      },
      { status: 429 },
    );
  }

  try {
    const { sanitizedPrompt, hadTextIntent } = sanitizeInviteImagePrompt(parsed.data.prompt);
    const fingerprint = crypto
      .createHash("sha256")
      .update(
        JSON.stringify({
          eventId: parsed.data.eventId,
          inviteId: parsed.data.inviteId,
          prompt: sanitizedPrompt.toLowerCase(),
        }),
      )
      .digest("hex");
    const generationPrompt = buildPartySwamiInviteImagePrompt({
      eventTitle: ownedEvent.title,
      eventType: ownedEvent.event_type,
      sanitizedStylePrompt: sanitizedPrompt,
    });
    const generated = await generateInviteBackgroundImageOptions(
      generationPrompt,
      requestedOptionCount,
    );
    const options = await Promise.all(
      generated.pngs.slice(0, requestedOptionCount).map((png, index) =>
        uploadInviteGeneratedImageOption({
          userId: user.id,
          eventId: parsed.data.eventId,
          inviteId: parsed.data.inviteId,
          optionIndex: index,
          png,
        }),
      ),
    );

    const estimatedCostUsd = estimateInviteImageCostUsd();
    const perImageEstimatedCostUsd = Number(
      (estimatedCostUsd / Math.max(options.length, 1)).toFixed(6),
    );

    await storeInviteImageOptions({
      supabase,
      userId: user.id,
      eventId: parsed.data.eventId,
      inviteId: parsed.data.inviteId,
      options: options.map((option) => ({
        sourcePath: option.sourcePath,
        sourceUrl: option.sourceUrl,
        sourceWidth: option.sourceWidth,
        sourceHeight: option.sourceHeight,
      })),
      perImageEstimatedCostUsd,
      promptExcerpt: sanitizedPrompt.slice(0, 180),
    });

    await trackInviteImageGeneration({
      supabase,
      userId: user.id,
      eventId: parsed.data.eventId,
      model: generated.model,
      fingerprint,
      acceptedCount: generated.metrics.acceptedCount,
      rejectedForText: generated.metrics.rejectedForText,
      estimatedCostUsd,
    });

    return NextResponse.json({
      ok: true,
      options: options.map((option, index) => ({
        id: `option-${index + 1}`,
        sourcePath: option.sourcePath,
        previewUrl: option.previewUrl,
        previewPath: option.previewPath,
      })),
      message: hadTextIntent
        ? "Generated text-free invite background options (text requests were automatically removed)."
        : "Generated 3 invite background options.",
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
