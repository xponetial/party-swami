"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  generateSocialCampaign,
  generateSocialContentItem,
  getOpenAIModel,
  getPromptVersion,
  type SocialBrandProfileContext,
} from "@/lib/ai/party-genie";
import { requireAdminAccess } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const planTierSchema = z.object({
  userId: z.string().uuid(),
  planTier: z.enum(["free", "pro", "admin"]),
});

const templateControlSchema = z.object({
  packSlug: z.string().min(1),
  templateId: z.string().min(1),
  isActive: z.coerce.boolean(),
});

const featureFlagSchema = z.object({
  key: z.string().min(1),
  enabled: z.coerce.boolean(),
  rolloutPercentage: z.coerce.number().int().min(0).max(100),
});

const adminNoteSchema = z.object({
  scopeType: z.enum(["user", "event"]),
  scopeId: z.string().uuid(),
  note: z.string().trim().min(5).max(2000),
});

const socialMediaBrandProfileSchema = z.object({
  tone: z.string().trim().min(10).max(500),
  audience: z.string().trim().min(10).max(500),
  signaturePhrases: z.string().trim().min(3).max(500),
  ctaStyle: z.string().trim().min(3).max(500),
  postingGoalPerWeek: z.coerce.number().int().min(0).max(100),
  focusMetrics: z.string().trim().min(3).max(500),
});

const socialMediaCampaignSchema = z.object({
  theme: z.string().trim().min(3).max(120),
  audience: z.string().trim().min(3).max(200),
  objective: z.string().trim().min(3).max(200),
  priority: z.enum(["low", "medium", "high"]),
  sourceEventType: z.string().trim().max(120).optional(),
  scheduledWeekOf: z.string().trim().optional(),
  notes: z.string().trim().max(1500).optional(),
});

const socialMediaCampaignStatusSchema = z.object({
  campaignId: z.string().uuid(),
  status: z.enum(["draft", "in_review", "approved", "scheduled", "published", "archived"]),
});

const socialMediaDeleteCampaignSchema = z.object({
  campaignId: z.string().uuid(),
});

const socialMediaGenerateCampaignSchema = z.object({
  theme: z.string().trim().min(3).max(120),
  audienceHint: z.string().trim().max(200).optional(),
  objectiveHint: z.string().trim().max(200).optional(),
  sourceEventType: z.string().trim().max(120).optional(),
  scheduledWeekOf: z.string().trim().optional(),
});

const socialMediaContentItemSchema = z.object({
  campaignId: z.string().uuid(),
  channel: z.enum(["tiktok", "pinterest", "instagram", "email", "landing_page"]),
  title: z.string().trim().min(3).max(160),
  formatDetail: z.string().trim().min(3).max(240),
  publishOn: z.string().trim().optional(),
  copy: z.string().trim().min(10).max(4000),
  callToAction: z.string().trim().min(2).max(240),
  hashtags: z.string().trim().max(500).optional(),
  visualDirection: z.string().trim().max(1000).optional(),
  imagePrompt: z.string().trim().max(2000).optional(),
  assetNotes: z.string().trim().max(2000).optional(),
  referenceLinks: z.string().trim().max(2000).optional(),
});

const socialMediaContentStatusSchema = z.object({
  contentItemId: z.string().uuid(),
  status: z.enum(["draft", "in_review", "approved", "scheduled", "published", "archived"]),
});

const socialMediaRescheduleContentSchema = z.object({
  contentItemId: z.string().uuid(),
  publishOn: z.string().trim().optional(),
});

const socialMediaUpdateContentItemSchema = z.object({
  contentItemId: z.string().uuid(),
  title: z.string().trim().min(3).max(160),
  formatDetail: z.string().trim().min(3).max(240),
  publishOn: z.string().trim().optional(),
  copy: z.string().trim().min(10).max(4000),
  callToAction: z.string().trim().min(2).max(240),
  hashtags: z.string().trim().max(500).optional(),
  visualDirection: z.string().trim().max(1000).optional(),
  imagePrompt: z.string().trim().max(2000).optional(),
  assetNotes: z.string().trim().max(2000).optional(),
  referenceLinks: z.string().trim().max(2000).optional(),
  status: z.enum(["draft", "in_review", "approved", "scheduled", "published", "archived"]),
});

const socialMediaDuplicateCampaignSchema = z.object({
  campaignId: z.string().uuid(),
});

const socialMediaBulkCampaignSchema = z.object({
  campaignId: z.string().uuid(),
  status: z.enum(["draft", "in_review", "approved", "scheduled", "published", "archived"]),
});

const socialMediaRegenerateCampaignSchema = z.object({
  campaignId: z.string().uuid(),
});

const socialMediaRegenerateContentSchema = z.object({
  contentItemId: z.string().uuid(),
});

function revalidateSocialMediaPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/social-media");
}

function currentUsageMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

function buildSocialRequestFingerprint(input: Record<string, unknown>) {
  return JSON.stringify(input, Object.keys(input).sort());
}

async function trackAdminAiGeneration({
  userId,
  generationType,
  model,
  requestFingerprint,
  promptVersion,
  inputTokens,
  outputTokens,
  cachedInputTokens,
  estimatedCostUsd,
  latencyMs,
  status,
}: {
  userId: string;
  generationType: string;
  model: string;
  requestFingerprint: string;
  promptVersion: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  estimatedCostUsd: number;
  latencyMs: number;
  status: "success" | "fallback" | "error";
}) {
  const supabase = createSupabaseAdminClient();

  await supabase.from("ai_generations").insert({
    user_id: userId,
    event_id: null,
    generation_type: generationType,
    model,
    request_fingerprint: requestFingerprint,
    prompt_version: promptVersion,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cached_input_tokens: cachedInputTokens,
    estimated_cost_usd: estimatedCostUsd,
    latency_ms: latencyMs,
    status,
  });

  const usageMonth = currentUsageMonth();
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
    input_tokens: (existingUsage?.input_tokens ?? 0) + inputTokens,
    output_tokens: (existingUsage?.output_tokens ?? 0) + outputTokens,
    cached_input_tokens: (existingUsage?.cached_input_tokens ?? 0) + cachedInputTokens,
    estimated_cost_usd: Number(
      ((existingUsage?.estimated_cost_usd ?? 0) + estimatedCostUsd).toFixed(6),
    ),
  };

  if (existingUsage) {
    await supabase.from("user_usage_monthly").update(payload).eq("id", existingUsage.id);
    return;
  }

  await supabase.from("user_usage_monthly").insert(payload);
}

async function logSocialMediaActivity({
  campaignId,
  contentItemId,
  action,
  summary,
  createdBy,
  metadata,
}: {
  campaignId?: string | null;
  contentItemId?: string | null;
  action: string;
  summary: string;
  createdBy?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("social_media_activity_log").insert({
    campaign_id: campaignId ?? null,
    content_item_id: contentItemId ?? null,
    action,
    summary,
    metadata: metadata ?? {},
    created_by: createdBy ?? null,
  });

  if (error && error.code !== "42P01") {
    console.error("Unable to log social media activity", error);
  }
}

function buildPublishDate(weekOf: string | null, publishOffsetDays: number) {
  if (!weekOf) {
    return null;
  }

  const base = new Date(`${weekOf}T00:00:00.000Z`);

  if (Number.isNaN(base.getTime())) {
    return null;
  }

  base.setUTCDate(base.getUTCDate() + publishOffsetDays);
  return base.toISOString().slice(0, 10);
}

async function loadSocialBrandProfile() {
  const supabase = createSupabaseAdminClient();
  const { data: profile } = await supabase
    .from("social_media_brand_profiles")
    .select("tone, audience, signature_phrases, cta_style, posting_goal_per_week, focus_metrics")
    .eq("scope", "default")
    .maybeSingle<{
      tone: string;
      audience: string;
      signature_phrases: string;
      cta_style: string;
      posting_goal_per_week: number;
      focus_metrics: string;
    }>();

  return {
    tone: profile?.tone ?? "Celebratory, practical, confidence-building.",
    audience: profile?.audience ?? "Hosts planning birthdays, showers, seasonal parties, and family gatherings.",
    signaturePhrases: profile?.signature_phrases ?? "easy-to-host, guest-ready, party-worthy",
    ctaStyle: profile?.cta_style ?? "save this, shop the look, plan your version",
    postingGoalPerWeek: profile?.posting_goal_per_week ?? 12,
    focusMetrics: profile?.focus_metrics ?? "engagement rate, ctr, conversions, posts per week",
  } satisfies SocialBrandProfileContext;
}

export async function updateAdminUserPlanTierAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = planTierSchema.safeParse({
    userId: formData.get("userId"),
    planTier: formData.get("planTier"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid plan tier update.");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({ plan_tier: parsed.data.planTier })
    .eq("id", parsed.data.userId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${parsed.data.userId}`);
  revalidatePath("/dashboard");
}

export async function updateTemplateControlAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = templateControlSchema.safeParse({
    packSlug: formData.get("packSlug"),
    templateId: formData.get("templateId"),
    isActive: formData.get("isActive"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid template control update.");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("template_admin_controls").upsert(
    {
      pack_slug: parsed.data.packSlug,
      template_id: parsed.data.templateId,
      is_active: parsed.data.isActive,
    },
    { onConflict: "pack_slug,template_id" },
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/templates");
  revalidatePath("/events/new");
  revalidatePath("/dashboard");
}

export async function updateFeatureFlagAction(formData: FormData) {
  await requireAdminAccess();
  const parsed = featureFlagSchema.safeParse({
    key: formData.get("key"),
    enabled: formData.get("enabled"),
    rolloutPercentage: formData.get("rolloutPercentage"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid feature flag update.");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("feature_flags")
    .update({
      enabled: parsed.data.enabled,
      rollout_percentage: parsed.data.rolloutPercentage,
    })
    .eq("key", parsed.data.key);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/flags");
}

export async function createAdminNoteAction(formData: FormData) {
  const admin = await requireAdminAccess();
  const parsed = adminNoteSchema.safeParse({
    scopeType: formData.get("scopeType"),
    scopeId: formData.get("scopeId"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid admin note.");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("admin_notes").insert({
    scope_type: parsed.data.scopeType,
    scope_id: parsed.data.scopeId,
    note: parsed.data.note,
    created_by: admin.userId,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (parsed.data.scopeType === "user") {
    revalidatePath(`/admin/users/${parsed.data.scopeId}`);
  } else {
    revalidatePath(`/admin/events/${parsed.data.scopeId}`);
  }

  revalidatePath("/admin/support");
}

export async function updateSocialMediaBrandProfileAction(formData: FormData) {
  const admin = await requireAdminAccess();
  const parsed = socialMediaBrandProfileSchema.safeParse({
    tone: formData.get("tone"),
    audience: formData.get("audience"),
    signaturePhrases: formData.get("signaturePhrases"),
    ctaStyle: formData.get("ctaStyle"),
    postingGoalPerWeek: formData.get("postingGoalPerWeek"),
    focusMetrics: formData.get("focusMetrics"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid brand voice settings.");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("social_media_brand_profiles").upsert(
    {
      scope: "default",
      tone: parsed.data.tone,
      audience: parsed.data.audience,
      signature_phrases: parsed.data.signaturePhrases,
      cta_style: parsed.data.ctaStyle,
      posting_goal_per_week: parsed.data.postingGoalPerWeek,
      focus_metrics: parsed.data.focusMetrics,
      updated_by: admin.userId,
    },
    { onConflict: "scope" },
  );

  if (error) {
    throw new Error(error.message);
  }

  await logSocialMediaActivity({
    action: "brand_profile_updated",
    summary: "Updated the default social media brand voice.",
    createdBy: admin.userId,
    metadata: {
      postingGoalPerWeek: parsed.data.postingGoalPerWeek,
      focusMetrics: parsed.data.focusMetrics,
    },
  });

  revalidateSocialMediaPaths();
}

export async function createSocialMediaCampaignAction(formData: FormData) {
  const admin = await requireAdminAccess();
  const parsed = socialMediaCampaignSchema.safeParse({
    theme: formData.get("theme"),
    audience: formData.get("audience"),
    objective: formData.get("objective"),
    priority: formData.get("priority"),
    sourceEventType: formData.get("sourceEventType") || undefined,
    scheduledWeekOf: formData.get("scheduledWeekOf") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid social campaign.");
  }

  const supabase = createSupabaseAdminClient();
  const scheduledWeekOf = parsed.data.scheduledWeekOf?.trim() || null;
  const status = scheduledWeekOf ? "scheduled" : "draft";
  const { error } = await supabase.from("social_media_campaigns").insert({
    theme: parsed.data.theme,
    audience: parsed.data.audience,
    objective: parsed.data.objective,
    priority: parsed.data.priority,
    source_event_type: parsed.data.sourceEventType?.trim() || null,
    scheduled_week_of: scheduledWeekOf,
    notes: parsed.data.notes?.trim() || "",
    status,
    created_by: admin.userId,
  });

  if (error) {
    throw new Error(error.message);
  }

  await logSocialMediaActivity({
    action: "campaign_created",
    summary: `Created campaign "${parsed.data.theme}".`,
    createdBy: admin.userId,
    metadata: {
      theme: parsed.data.theme,
      status,
      priority: parsed.data.priority,
    },
  });

  revalidateSocialMediaPaths();
}

export async function generateSocialMediaCampaignAction(formData: FormData) {
  const admin = await requireAdminAccess();
  const parsed = socialMediaGenerateCampaignSchema.safeParse({
    theme: formData.get("theme"),
    audienceHint: formData.get("audienceHint") || undefined,
    objectiveHint: formData.get("objectiveHint") || undefined,
    sourceEventType: formData.get("sourceEventType") || undefined,
    scheduledWeekOf: formData.get("scheduledWeekOf") || undefined,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid campaign generation request.");
  }

  const supabase = createSupabaseAdminClient();
  const brandProfile = await loadSocialBrandProfile();

  const generated = await generateSocialCampaign(
    {
      theme: parsed.data.theme,
      audienceHint: parsed.data.audienceHint,
      objectiveHint: parsed.data.objectiveHint,
      sourceEventType: parsed.data.sourceEventType,
    },
    brandProfile,
  );

  const scheduledWeekOf = parsed.data.scheduledWeekOf?.trim() || null;
  const { data: createdCampaign, error: campaignError } = await supabase
    .from("social_media_campaigns")
    .insert({
      theme: parsed.data.theme,
      audience: generated.audience,
      objective: generated.objective,
      priority: generated.priority,
      source_event_type: generated.sourceEventType,
      scheduled_week_of: scheduledWeekOf,
      notes: generated.notes,
      generation_summary: generated.rawResponse.summary ?? "",
      status: "in_review",
      created_by: admin.userId,
    })
    .select("id")
    .single<{ id: string }>();

  if (campaignError || !createdCampaign) {
    throw new Error(campaignError?.message ?? "Unable to create generated campaign.");
  }

  const { error: contentError } = await supabase.from("social_media_content_items").insert(
    generated.contentItems.map((item) => ({
      campaign_id: createdCampaign.id,
      channel: item.channel,
      title: item.title,
      format_detail: item.formatDetail,
      status: "in_review",
      publish_on: buildPublishDate(scheduledWeekOf, item.publishOffsetDays),
      copy: item.copy,
      call_to_action: item.callToAction,
      hashtags: item.hashtags,
      visual_direction: item.visualDirection,
    })),
  );

  if (contentError) {
    throw new Error(contentError.message);
  }

  const usage = generated.rawResponse.usage;
  await trackAdminAiGeneration({
    userId: admin.userId,
    generationType: "social_campaign",
    model: generated.rawResponse.model ?? getOpenAIModel("plan"),
    requestFingerprint: buildSocialRequestFingerprint({
      theme: parsed.data.theme.trim().toLowerCase(),
      audienceHint: parsed.data.audienceHint?.trim().toLowerCase() ?? null,
      objectiveHint: parsed.data.objectiveHint?.trim().toLowerCase() ?? null,
      sourceEventType: parsed.data.sourceEventType?.trim().toLowerCase() ?? null,
      tone: brandProfile.tone.trim().toLowerCase(),
      audience: brandProfile.audience.trim().toLowerCase(),
      signaturePhrases: brandProfile.signaturePhrases.trim().toLowerCase(),
      ctaStyle: brandProfile.ctaStyle.trim().toLowerCase(),
      focusMetrics: brandProfile.focusMetrics.trim().toLowerCase(),
      postingGoalPerWeek: brandProfile.postingGoalPerWeek,
    }),
    promptVersion: generated.rawResponse.promptVersion ?? getPromptVersion("social_campaign"),
    inputTokens: usage?.inputTokens ?? 0,
    outputTokens: usage?.outputTokens ?? 0,
    cachedInputTokens: usage?.cachedInputTokens ?? 0,
    estimatedCostUsd: usage?.estimatedCostUsd ?? 0,
    latencyMs: usage?.latencyMs ?? 0,
    status: usage?.usedFallback ? "fallback" : "success",
  });

  await logSocialMediaActivity({
    campaignId: createdCampaign.id,
    action: "campaign_generated",
    summary: `Generated campaign "${parsed.data.theme}" from theme.`,
    createdBy: admin.userId,
    metadata: {
      theme: parsed.data.theme,
      contentItems: generated.contentItems.length,
      usedFallback: usage?.usedFallback ?? false,
    },
  });

  revalidateSocialMediaPaths();
}

export async function updateSocialMediaCampaignStatusAction(formData: FormData) {
  const admin = await requireAdminAccess();
  const parsed = socialMediaCampaignStatusSchema.safeParse({
    campaignId: formData.get("campaignId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid campaign status.");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("social_media_campaigns")
    .update({
      status: parsed.data.status,
      archived_at: parsed.data.status === "archived" ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.campaignId);

  if (error) {
    throw new Error(error.message);
  }

  await logSocialMediaActivity({
    campaignId: parsed.data.campaignId,
    action: "campaign_status_updated",
    summary: `Moved campaign to ${parsed.data.status.replaceAll("_", " ")}.`,
    createdBy: admin.userId,
    metadata: { status: parsed.data.status },
  });

  revalidateSocialMediaPaths();
}

export async function deleteSocialMediaCampaignAction(formData: FormData) {
  const admin = await requireAdminAccess();
  const parsed = socialMediaDeleteCampaignSchema.safeParse({
    campaignId: formData.get("campaignId"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid campaign delete request.");
  }

  const supabase = createSupabaseAdminClient();
  const { data: campaign } = await supabase
    .from("social_media_campaigns")
    .select("id, theme")
    .eq("id", parsed.data.campaignId)
    .maybeSingle<{ id: string; theme: string }>();
  const { error } = await supabase
    .from("social_media_campaigns")
    .delete()
    .eq("id", parsed.data.campaignId);

  if (error) {
    throw new Error(error.message);
  }

  await logSocialMediaActivity({
    action: "campaign_deleted",
    summary: `Deleted campaign "${campaign?.theme ?? "Untitled campaign"}".`,
    createdBy: admin.userId,
    metadata: {
      campaignId: parsed.data.campaignId,
      theme: campaign?.theme ?? null,
    },
  });

  revalidateSocialMediaPaths();
}

export async function duplicateSocialMediaCampaignAction(formData: FormData) {
  const admin = await requireAdminAccess();
  const parsed = socialMediaDuplicateCampaignSchema.safeParse({
    campaignId: formData.get("campaignId"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid campaign duplicate request.");
  }

  const supabase = createSupabaseAdminClient();
  const { data: campaign } = await supabase
    .from("social_media_campaigns")
    .select("theme, audience, objective, priority, source_event_type, scheduled_week_of, notes, generation_summary")
    .eq("id", parsed.data.campaignId)
    .maybeSingle<{
      theme: string;
      audience: string;
      objective: string;
      priority: "low" | "medium" | "high";
      source_event_type: string | null;
      scheduled_week_of: string | null;
      notes: string;
      generation_summary: string;
    }>();

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  const { data: createdCampaign, error: insertCampaignError } = await supabase
    .from("social_media_campaigns")
    .insert({
      theme: `${campaign.theme} copy`,
      audience: campaign.audience,
      objective: campaign.objective,
      priority: campaign.priority,
      source_event_type: campaign.source_event_type,
      scheduled_week_of: campaign.scheduled_week_of,
      notes: campaign.notes,
      generation_summary: campaign.generation_summary,
      status: "draft",
      created_by: admin.userId,
    })
    .select("id")
    .single<{ id: string }>();

  if (insertCampaignError || !createdCampaign) {
    throw new Error(insertCampaignError?.message ?? "Unable to duplicate campaign.");
  }

  const { data: contentItemsData } = await supabase
    .from("social_media_content_items")
    .select("channel, title, format_detail, publish_on, copy, call_to_action, hashtags, visual_direction, image_prompt, asset_notes, reference_links")
    .eq("campaign_id", parsed.data.campaignId)
    .returns<
      Array<{
        channel: "tiktok" | "pinterest" | "instagram" | "email" | "landing_page";
        title: string;
        format_detail: string;
        publish_on: string | null;
        copy: string;
        call_to_action: string;
        hashtags: string;
        visual_direction: string;
        image_prompt: string;
        asset_notes: string;
        reference_links: string;
      }>
    >();

  const contentItems = contentItemsData ?? [];

  if (contentItems.length) {
    const { error: contentError } = await supabase.from("social_media_content_items").insert(
      contentItems.map((item) => ({
        campaign_id: createdCampaign.id,
        channel: item.channel,
        title: item.title,
        format_detail: item.format_detail,
        publish_on: item.publish_on,
        copy: item.copy,
        call_to_action: item.call_to_action,
        hashtags: item.hashtags,
        visual_direction: item.visual_direction,
        image_prompt: item.image_prompt,
        asset_notes: item.asset_notes,
        reference_links: item.reference_links,
        status: "draft",
      })),
    );

    if (contentError) {
      throw new Error(contentError.message);
    }
  }

  await logSocialMediaActivity({
    campaignId: createdCampaign.id,
    action: "campaign_duplicated",
    summary: `Duplicated campaign "${campaign.theme}".`,
    createdBy: admin.userId,
    metadata: {
      sourceCampaignId: parsed.data.campaignId,
      sourceTheme: campaign.theme,
      duplicatedItems: contentItems.length,
    },
  });

  revalidateSocialMediaPaths();
}

export async function archiveSocialMediaCampaignAction(formData: FormData) {
  const admin = await requireAdminAccess();
  const parsed = socialMediaDuplicateCampaignSchema.safeParse({
    campaignId: formData.get("campaignId"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid campaign archive request.");
  }

  const supabase = createSupabaseAdminClient();
  const archivedAt = new Date().toISOString();

  const [{ error: campaignError }, { error: contentError }] = await Promise.all([
    supabase
      .from("social_media_campaigns")
      .update({ status: "archived", archived_at: archivedAt })
      .eq("id", parsed.data.campaignId),
    supabase
      .from("social_media_content_items")
      .update({ status: "archived" })
      .eq("campaign_id", parsed.data.campaignId),
  ]);

  if (campaignError) {
    throw new Error(campaignError.message);
  }

  if (contentError) {
    throw new Error(contentError.message);
  }

  await logSocialMediaActivity({
    campaignId: parsed.data.campaignId,
    action: "campaign_archived",
    summary: "Archived campaign and moved its drafts out of the active queue.",
    createdBy: admin.userId,
  });

  revalidateSocialMediaPaths();
}

export async function bulkUpdateSocialMediaCampaignContentStatusAction(formData: FormData) {
  const admin = await requireAdminAccess();
  const parsed = socialMediaBulkCampaignSchema.safeParse({
    campaignId: formData.get("campaignId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid campaign bulk update.");
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("social_media_content_items")
    .update({ status: parsed.data.status })
    .eq("campaign_id", parsed.data.campaignId)
    .neq("status", "archived");

  if (error) {
    throw new Error(error.message);
  }

  await logSocialMediaActivity({
    campaignId: parsed.data.campaignId,
    action: "campaign_bulk_status_updated",
    summary: `Updated all active campaign drafts to ${parsed.data.status.replaceAll("_", " ")}.`,
    createdBy: admin.userId,
    metadata: { status: parsed.data.status },
  });

  revalidateSocialMediaPaths();
}

export async function regenerateSocialMediaCampaignAction(formData: FormData) {
  const admin = await requireAdminAccess();
  const parsed = socialMediaRegenerateCampaignSchema.safeParse({
    campaignId: formData.get("campaignId"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid regenerate campaign request.");
  }

  const supabase = createSupabaseAdminClient();
  const { data: campaign } = await supabase
    .from("social_media_campaigns")
    .select("id, theme, audience, objective, source_event_type, scheduled_week_of, notes")
    .eq("id", parsed.data.campaignId)
    .maybeSingle<{
      id: string;
      theme: string;
      audience: string;
      objective: string;
      source_event_type: string | null;
      scheduled_week_of: string | null;
      notes: string;
    }>();

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  const brandProfile = await loadSocialBrandProfile();
  const generated = await generateSocialCampaign(
    {
      theme: campaign.theme,
      audienceHint: campaign.audience,
      objectiveHint: campaign.objective,
      sourceEventType: campaign.source_event_type,
    },
    brandProfile,
  );

  const [{ error: updateCampaignError }, { error: deleteContentError }] = await Promise.all([
    supabase
      .from("social_media_campaigns")
      .update({
        audience: generated.audience,
        objective: generated.objective,
        priority: generated.priority,
        notes: generated.notes,
        generation_summary: generated.rawResponse.summary ?? "",
        status: "in_review",
        archived_at: null,
      })
      .eq("id", campaign.id),
    supabase.from("social_media_content_items").delete().eq("campaign_id", campaign.id),
  ]);

  if (updateCampaignError) {
    throw new Error(updateCampaignError.message);
  }

  if (deleteContentError) {
    throw new Error(deleteContentError.message);
  }

  const { error: insertContentError } = await supabase.from("social_media_content_items").insert(
    generated.contentItems.map((item) => ({
      campaign_id: campaign.id,
      channel: item.channel,
      title: item.title,
      format_detail: item.formatDetail,
      status: "in_review",
      publish_on: buildPublishDate(campaign.scheduled_week_of, item.publishOffsetDays),
      copy: item.copy,
      call_to_action: item.callToAction,
      hashtags: item.hashtags,
      visual_direction: item.visualDirection,
      image_prompt: item.visualDirection,
      asset_notes: "",
      reference_links: "",
    })),
  );

  if (insertContentError) {
    throw new Error(insertContentError.message);
  }

  const usage = generated.rawResponse.usage;
  await trackAdminAiGeneration({
    userId: admin.userId,
    generationType: "social_campaign",
    model: generated.rawResponse.model ?? getOpenAIModel("plan"),
    requestFingerprint: buildSocialRequestFingerprint({
      regenerateCampaignId: campaign.id,
      theme: campaign.theme.trim().toLowerCase(),
      audience: campaign.audience.trim().toLowerCase(),
      objective: campaign.objective.trim().toLowerCase(),
    }),
    promptVersion: generated.rawResponse.promptVersion ?? getPromptVersion("social_campaign"),
    inputTokens: usage?.inputTokens ?? 0,
    outputTokens: usage?.outputTokens ?? 0,
    cachedInputTokens: usage?.cachedInputTokens ?? 0,
    estimatedCostUsd: usage?.estimatedCostUsd ?? 0,
    latencyMs: usage?.latencyMs ?? 0,
    status: usage?.usedFallback ? "fallback" : "success",
  });

  await logSocialMediaActivity({
    campaignId: campaign.id,
    action: "campaign_regenerated",
    summary: `Regenerated campaign "${campaign.theme}" and replaced its draft set.`,
    createdBy: admin.userId,
    metadata: {
      contentItems: generated.contentItems.length,
      usedFallback: usage?.usedFallback ?? false,
    },
  });

  revalidateSocialMediaPaths();
}

export async function createSocialMediaContentItemAction(formData: FormData) {
  const admin = await requireAdminAccess();
  const parsed = socialMediaContentItemSchema.safeParse({
    campaignId: formData.get("campaignId"),
    channel: formData.get("channel"),
    title: formData.get("title"),
    formatDetail: formData.get("formatDetail"),
    publishOn: formData.get("publishOn") || undefined,
    copy: formData.get("copy"),
    callToAction: formData.get("callToAction"),
    hashtags: formData.get("hashtags") || undefined,
    visualDirection: formData.get("visualDirection") || undefined,
    imagePrompt: formData.get("imagePrompt") || undefined,
    assetNotes: formData.get("assetNotes") || undefined,
    referenceLinks: formData.get("referenceLinks") || undefined,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid content draft.");
  }

  const supabase = createSupabaseAdminClient();
  const publishOn = parsed.data.publishOn?.trim() || null;
  const status = publishOn ? "scheduled" : "draft";
  const { error } = await supabase.from("social_media_content_items").insert({
    campaign_id: parsed.data.campaignId,
    channel: parsed.data.channel,
    title: parsed.data.title,
    format_detail: parsed.data.formatDetail,
    publish_on: publishOn,
    status,
    copy: parsed.data.copy,
    call_to_action: parsed.data.callToAction,
    hashtags: parsed.data.hashtags?.trim() || "",
    visual_direction: parsed.data.visualDirection?.trim() || "",
    image_prompt: parsed.data.imagePrompt?.trim() || "",
    asset_notes: parsed.data.assetNotes?.trim() || "",
    reference_links: parsed.data.referenceLinks?.trim() || "",
  });

  if (error) {
    throw new Error(error.message);
  }

  await logSocialMediaActivity({
    campaignId: parsed.data.campaignId,
    action: "content_created",
    summary: `Added ${parsed.data.channel.replaceAll("_", " ")} draft "${parsed.data.title}".`,
    createdBy: admin.userId,
    metadata: {
      channel: parsed.data.channel,
      status,
      publishOn,
    },
  });

  revalidateSocialMediaPaths();
}

export async function updateSocialMediaContentItemAction(formData: FormData) {
  const admin = await requireAdminAccess();
  const parsed = socialMediaUpdateContentItemSchema.safeParse({
    contentItemId: formData.get("contentItemId"),
    title: formData.get("title"),
    formatDetail: formData.get("formatDetail"),
    publishOn: formData.get("publishOn") || undefined,
    copy: formData.get("copy"),
    callToAction: formData.get("callToAction"),
    hashtags: formData.get("hashtags") || undefined,
    visualDirection: formData.get("visualDirection") || undefined,
    imagePrompt: formData.get("imagePrompt") || undefined,
    assetNotes: formData.get("assetNotes") || undefined,
    referenceLinks: formData.get("referenceLinks") || undefined,
    status: formData.get("status"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid content update.");
  }

  const supabase = createSupabaseAdminClient();
  const publishOn = parsed.data.publishOn?.trim() || null;
  const { data: existingItem } = await supabase
    .from("social_media_content_items")
    .select("campaign_id")
    .eq("id", parsed.data.contentItemId)
    .maybeSingle<{ campaign_id: string }>();
  const { error } = await supabase
    .from("social_media_content_items")
    .update({
      title: parsed.data.title,
      format_detail: parsed.data.formatDetail,
      publish_on: publishOn,
      copy: parsed.data.copy,
      call_to_action: parsed.data.callToAction,
      hashtags: parsed.data.hashtags?.trim() || "",
      visual_direction: parsed.data.visualDirection?.trim() || "",
      image_prompt: parsed.data.imagePrompt?.trim() || "",
      asset_notes: parsed.data.assetNotes?.trim() || "",
      reference_links: parsed.data.referenceLinks?.trim() || "",
      status: parsed.data.status,
    })
    .eq("id", parsed.data.contentItemId);

  if (error) {
    throw new Error(error.message);
  }

  await logSocialMediaActivity({
    campaignId: existingItem?.campaign_id ?? null,
    contentItemId: parsed.data.contentItemId,
    action: "content_updated",
    summary: `Saved edits to "${parsed.data.title}".`,
    createdBy: admin.userId,
    metadata: {
      status: parsed.data.status,
      publishOn,
    },
  });

  revalidateSocialMediaPaths();
}

export async function regenerateSocialMediaContentItemAction(formData: FormData) {
  const admin = await requireAdminAccess();
  const parsed = socialMediaRegenerateContentSchema.safeParse({
    contentItemId: formData.get("contentItemId"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid content regenerate request.");
  }

  const supabase = createSupabaseAdminClient();
  const { data: contentItem } = await supabase
    .from("social_media_content_items")
    .select("id, campaign_id, channel, publish_on")
    .eq("id", parsed.data.contentItemId)
    .maybeSingle<{
      id: string;
      campaign_id: string;
      channel: "tiktok" | "pinterest" | "instagram" | "email" | "landing_page";
      publish_on: string | null;
    }>();

  if (!contentItem) {
    throw new Error("Content item not found.");
  }

  const { data: campaign } = await supabase
    .from("social_media_campaigns")
    .select("theme, audience, objective, notes")
    .eq("id", contentItem.campaign_id)
    .maybeSingle<{
      theme: string;
      audience: string;
      objective: string;
      notes: string;
    }>();

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  const brandProfile = await loadSocialBrandProfile();
  const regenerated = await generateSocialContentItem(
    {
      theme: campaign.theme,
      channel: contentItem.channel,
      audience: campaign.audience,
      objective: campaign.objective,
      notes: campaign.notes,
    },
    brandProfile,
  );

  const { error } = await supabase
    .from("social_media_content_items")
    .update({
      title: regenerated.item.title,
      format_detail: regenerated.item.formatDetail,
      copy: regenerated.item.copy,
      call_to_action: regenerated.item.callToAction,
      hashtags: regenerated.item.hashtags,
      visual_direction: regenerated.item.visualDirection,
      image_prompt: regenerated.item.visualDirection,
      status: "in_review",
      publish_on: contentItem.publish_on,
    })
    .eq("id", contentItem.id);

  if (error) {
    throw new Error(error.message);
  }

  const usage = regenerated.rawResponse.usage;
  await trackAdminAiGeneration({
    userId: admin.userId,
    generationType: "social_content_regeneration",
    model: regenerated.rawResponse.model ?? getOpenAIModel("lightweight"),
    requestFingerprint: buildSocialRequestFingerprint({
      regenerateContentItemId: contentItem.id,
      campaignId: contentItem.campaign_id,
      channel: contentItem.channel,
      theme: campaign.theme.trim().toLowerCase(),
      audience: campaign.audience.trim().toLowerCase(),
      objective: campaign.objective.trim().toLowerCase(),
    }),
    promptVersion:
      regenerated.rawResponse.promptVersion ?? getPromptVersion("social_content_regeneration"),
    inputTokens: usage?.inputTokens ?? 0,
    outputTokens: usage?.outputTokens ?? 0,
    cachedInputTokens: usage?.cachedInputTokens ?? 0,
    estimatedCostUsd: usage?.estimatedCostUsd ?? 0,
    latencyMs: usage?.latencyMs ?? 0,
    status: usage?.usedFallback ? "fallback" : "success",
  });

  await logSocialMediaActivity({
    campaignId: contentItem.campaign_id,
    contentItemId: contentItem.id,
    action: "content_regenerated",
    summary: `Regenerated ${contentItem.channel.replaceAll("_", " ")} draft.`,
    createdBy: admin.userId,
    metadata: {
      channel: contentItem.channel,
      usedFallback: usage?.usedFallback ?? false,
    },
  });

  revalidateSocialMediaPaths();
}

export async function updateSocialMediaContentStatusAction(formData: FormData) {
  const admin = await requireAdminAccess();
  const parsed = socialMediaContentStatusSchema.safeParse({
    contentItemId: formData.get("contentItemId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid content status.");
  }

  const supabase = createSupabaseAdminClient();
  const { data: existingItem } = await supabase
    .from("social_media_content_items")
    .select("campaign_id, title")
    .eq("id", parsed.data.contentItemId)
    .maybeSingle<{ campaign_id: string; title: string }>();
  const { error } = await supabase
    .from("social_media_content_items")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.contentItemId);

  if (error) {
    throw new Error(error.message);
  }

  await logSocialMediaActivity({
    campaignId: existingItem?.campaign_id ?? null,
    contentItemId: parsed.data.contentItemId,
    action: "content_status_updated",
    summary: `Moved "${existingItem?.title ?? "Draft"}" to ${parsed.data.status.replaceAll("_", " ")}.`,
    createdBy: admin.userId,
    metadata: { status: parsed.data.status },
  });

  revalidateSocialMediaPaths();
}

export async function rescheduleSocialMediaContentItemAction(formData: FormData) {
  const admin = await requireAdminAccess();
  const parsed = socialMediaRescheduleContentSchema.safeParse({
    contentItemId: formData.get("contentItemId"),
    publishOn: formData.get("publishOn") || undefined,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid publish date update.");
  }

  const supabase = createSupabaseAdminClient();
  const publishOn = parsed.data.publishOn?.trim() || null;
  const { data: existingItem } = await supabase
    .from("social_media_content_items")
    .select("campaign_id, title, status")
    .eq("id", parsed.data.contentItemId)
    .maybeSingle<{
      campaign_id: string;
      title: string;
      status: "draft" | "in_review" | "approved" | "scheduled" | "published" | "archived";
    }>();

  if (!existingItem) {
    throw new Error("Content item not found.");
  }

  const nextStatus =
    existingItem.status === "published" || existingItem.status === "archived"
      ? existingItem.status
      : publishOn
        ? "scheduled"
        : "approved";

  const { error } = await supabase
    .from("social_media_content_items")
    .update({
      publish_on: publishOn,
      status: nextStatus,
    })
    .eq("id", parsed.data.contentItemId);

  if (error) {
    throw new Error(error.message);
  }

  await logSocialMediaActivity({
    campaignId: existingItem.campaign_id,
    contentItemId: parsed.data.contentItemId,
    action: "content_rescheduled",
    summary: publishOn
      ? `Scheduled "${existingItem.title}" for ${publishOn}.`
      : `Cleared the publish date for "${existingItem.title}".`,
    createdBy: admin.userId,
    metadata: {
      publishOn,
      status: nextStatus,
    },
  });

  revalidateSocialMediaPaths();
}
