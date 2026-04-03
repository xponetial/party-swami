import crypto from "node:crypto";
import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  type AiGenerationType,
  type GeneratedPartyPlan,
  generateInviteCopy,
  generatePartyPlan,
  revisePartyPlan,
  generateShoppingList,
  getOpenAIModel,
  getPromptVersion,
} from "@/lib/ai/party-genie";
import { normalizeInviteDesignData, type InviteDesignData } from "@/lib/invite-design";

type EventRecord = {
  id: string;
  owner_id: string;
  title: string;
  event_type: string;
  event_date: string | null;
  location: string | null;
  guest_target: number | null;
  budget: number | null;
  theme: string | null;
};

type ShoppingListRecord = {
  id: string;
  retailer: "amazon" | "walmart" | "mixed" | null;
};

type CachedPlanRecord = {
  id: string;
  event_id: string;
  theme: string | null;
  invite_copy: string | null;
  menu: string[] | null;
  shopping_categories:
    | Array<{ category: string; items: Array<{ name: string; quantity: number }> }>
    | null;
  tasks: Array<{ title: string; due_label: string; phase: string }> | null;
  timeline: Array<{ label: string; detail: string; sort_order: number }> | null;
  raw_response:
    | {
        provider?: string;
        generatedAt?: string;
        summary?: string;
        model?: string;
        promptVersion?: string;
        usage?: object;
      }
    | null;
  request_fingerprint: string | null;
  prompt_version: string | null;
  model: string | null;
  summary: string | null;
};

type PlanVersionRecord = {
  id?: string;
  plan_json?: unknown;
  change_reason?: string | null;
  created_at?: string;
  version_num: number;
};

type InviteRecord = {
  id: string;
  design_json: InviteDesignData | null;
};

const storedPlanSnapshotSchema = z.object({
  theme: z.string().nullable().optional(),
  inviteCopy: z.string().default(""),
  menu: z.array(z.string()).default([]),
  shoppingCategories: z
    .array(
      z.object({
        category: z.string(),
        items: z.array(
          z.object({
            name: z.string(),
            quantity: z.number().int().min(1),
          }),
        ),
      }),
    )
    .default([]),
  tasks: z
    .array(
      z.object({
        title: z.string(),
        due_label: z.string().default(""),
        phase: z.string().default(""),
      }),
    )
    .default([]),
  timeline: z
    .array(
      z.object({
        label: z.string(),
        detail: z.string(),
        sort_order: z.number().int().optional(),
      }),
    )
    .default([]),
});

type StoredPlanSnapshot = z.infer<typeof storedPlanSnapshotSchema>;

function buildFingerprint(input: Record<string, unknown>) {
  const canonical = JSON.stringify(input, Object.keys(input).sort());
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

function monthBucket(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

function normalizePreferences(value: Array<string | null | undefined>) {
  return value
    .filter((item): item is string => Boolean(item?.trim()))
    .map((item) => item.trim().toLowerCase())
    .sort();
}

function buildEventFingerprint(event: EventRecord, generationType: AiGenerationType) {
  const model =
    generationType === "party_plan"
      ? getOpenAIModel("plan")
      : generationType === "premium_concierge"
        ? getOpenAIModel("premium")
        : getOpenAIModel("lightweight");

  return {
    generationType,
    promptVersion: getPromptVersion(generationType),
    model,
    title: event.title.trim().toLowerCase(),
    eventType: event.event_type.trim().toLowerCase(),
    eventDate: event.event_date ?? null,
    location: event.location?.trim().toLowerCase() ?? null,
    guestTarget: event.guest_target ?? null,
    budget: event.budget ?? null,
    theme: event.theme?.trim().toLowerCase() ?? null,
    preferences: normalizePreferences([event.event_type, event.theme, event.location]),
  };
}

async function trackGeneration(
  supabase: SupabaseClient,
  {
    userId,
    eventId,
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
    eventId: string;
    generationType: AiGenerationType;
    model: string;
    requestFingerprint: string;
    promptVersion: string;
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens: number;
    estimatedCostUsd: number;
    latencyMs: number;
    status: "success" | "cached" | "fallback" | "error";
  },
) {
  const now = new Date();

  await supabase.from("ai_generations").insert({
    user_id: userId,
    event_id: eventId,
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

  const usageMonth = monthBucket(now);

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

async function loadEventSeed(supabase: SupabaseClient, eventId: string) {
  const [{ data: event, error: eventError }, { count: guestCount }] = await Promise.all([
    supabase
      .from("events")
      .select("id, owner_id, title, event_type, event_date, location, guest_target, budget, theme")
      .eq("id", eventId)
      .single<EventRecord>(),
    supabase
      .from("guests")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId),
  ]);

  if (eventError || !event) {
    throw new Error(eventError?.message ?? "Event not found.");
  }

  return {
    ...event,
    guest_target: event.guest_target ?? guestCount ?? null,
  };
}

async function loadCachedPlan(
  supabase: SupabaseClient,
  eventId: string,
  requestFingerprint: string,
  promptVersion: string,
  model: string,
) {
  const { data } = await supabase
    .from("party_plans")
    .select(
      "id, event_id, theme, invite_copy, menu, shopping_categories, tasks, timeline, raw_response, request_fingerprint, prompt_version, model, summary",
    )
    .eq("event_id", eventId)
    .eq("request_fingerprint", requestFingerprint)
    .eq("prompt_version", promptVersion)
    .eq("model", model)
    .maybeSingle<CachedPlanRecord>();

  return data ?? null;
}

async function getCurrentPlanRecord(supabase: SupabaseClient, eventId: string) {
  const { data } = await supabase
    .from("party_plans")
    .select(
      "id, event_id, theme, invite_copy, menu, shopping_categories, tasks, timeline, raw_response, request_fingerprint, prompt_version, model, summary",
    )
    .eq("event_id", eventId)
    .maybeSingle<CachedPlanRecord & { id: string }>();

  return data ?? null;
}

async function getPlanContextForShopping(supabase: SupabaseClient, eventId: string) {
  const { data } = await supabase
    .from("party_plans")
    .select("theme, menu, shopping_categories")
    .eq("event_id", eventId)
    .maybeSingle<{
      theme: string | null;
      menu: string[] | null;
      shopping_categories:
        | Array<{ category: string; items: Array<{ name: string; quantity: number }> }>
        | null;
    }>();

  return data ?? null;
}

async function ensureInvite(supabase: SupabaseClient, eventId: string, inviteCopy: string) {
  const { data: invite } = await supabase
    .from("invites")
    .select("id")
    .eq("event_id", eventId)
    .maybeSingle<{ id: string }>();

  if (invite) {
    await supabase
      .from("invites")
      .update({ invite_copy: inviteCopy })
      .eq("id", invite.id);
    return invite.id;
  }

  const { data: createdInvite, error } = await supabase
    .from("invites")
    .insert({ event_id: eventId, invite_copy: inviteCopy, is_public: false })
    .select("id")
    .single<{ id: string }>();

  if (error || !createdInvite) {
    throw new Error(error?.message ?? "Unable to create invite.");
  }

  return createdInvite.id;
}

async function loadInviteRecord(supabase: SupabaseClient, eventId: string) {
  const { data } = await supabase
    .from("invites")
    .select("id, design_json")
    .eq("event_id", eventId)
    .maybeSingle<InviteRecord>();

  return data ?? null;
}

async function ensureShoppingList(supabase: SupabaseClient, eventId: string) {
  const { data: existing } = await supabase
    .from("shopping_lists")
    .select("id, retailer")
    .eq("event_id", eventId)
    .maybeSingle<ShoppingListRecord>();

  if (existing) {
    return existing;
  }

  const { data: created, error } = await supabase
    .from("shopping_lists")
    .insert({
      event_id: eventId,
      retailer: "mixed",
      estimated_total: 0,
    })
    .select("id, retailer")
    .single<ShoppingListRecord>();

  if (error || !created) {
    throw new Error(error?.message ?? "Unable to create shopping list.");
  }

  return created;
}

async function syncShoppingItems(
  supabase: SupabaseClient,
  shoppingListId: string,
  generatedItems: Array<{
    category: string;
    name: string;
    quantity: number;
    estimated_price: number | null;
    recommendation_reason: string;
    search_query: string;
    image_url: string | null;
    external_url: string | null;
  }>,
) {
  const { data: existingItemsData } = await supabase
    .from("shopping_items")
    .select("id, category, name")
    .eq("shopping_list_id", shoppingListId)
    .returns<Array<{ id: string; category: string; name: string }>>();
  const existingItems = existingItemsData ?? [];

  const existingKeys = new Set(
    existingItems.map((item) => `${item.category.toLowerCase()}::${item.name.toLowerCase()}`),
  );

  const missingItems = generatedItems.filter(
    (item) => !existingKeys.has(`${item.category.toLowerCase()}::${item.name.toLowerCase()}`),
  );

  if (missingItems.length) {
    const { error } = await supabase.from("shopping_items").insert(
      missingItems.map((item, index) => ({
        shopping_list_id: shoppingListId,
        category: item.category,
        name: item.name,
        quantity: item.quantity,
        estimated_price: item.estimated_price,
        recommendation_reason: item.recommendation_reason,
        search_query: item.search_query,
        image_url: item.image_url,
        external_url: item.external_url,
        sort_order: index,
      })),
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  const matchingItems = generatedItems.filter((item) =>
    existingKeys.has(`${item.category.toLowerCase()}::${item.name.toLowerCase()}`),
  );

  if (matchingItems.length) {
    await Promise.all(
      matchingItems.map((item) => {
        const existingItem = existingItems.find(
          (current) =>
            current.category.toLowerCase() === item.category.toLowerCase() &&
            current.name.toLowerCase() === item.name.toLowerCase(),
        );

        if (!existingItem) {
          return Promise.resolve();
        }

        return supabase
          .from("shopping_items")
          .update({
            quantity: item.quantity,
            estimated_price: item.estimated_price,
            recommendation_reason: item.recommendation_reason,
            search_query: item.search_query,
            image_url: item.image_url,
            external_url: item.external_url,
          })
          .eq("id", existingItem.id);
      }),
    );
  }

  const { data: currentItemsData } = await supabase
    .from("shopping_items")
    .select("estimated_price, quantity")
    .eq("shopping_list_id", shoppingListId)
    .returns<Array<{ estimated_price: number | null; quantity: number }>>();
  const currentItems = currentItemsData ?? [];

  const estimatedTotal = currentItems.reduce(
    (sum, item) => sum + (item.estimated_price ?? 0) * item.quantity,
    0,
  );

  await supabase
    .from("shopping_lists")
    .update({ estimated_total: estimatedTotal })
    .eq("id", shoppingListId);

  return {
    addedCount: missingItems.length,
    estimatedTotal,
  };
}

async function replaceShoppingItems(
  supabase: SupabaseClient,
  shoppingListId: string,
  items: Array<{
    category: string;
    name: string;
    quantity: number;
    estimated_price: number | null;
    recommendation_reason: string | null;
    search_query: string | null;
    image_url: string | null;
    external_url: string | null;
  }>,
) {
  await supabase.from("shopping_items").delete().eq("shopping_list_id", shoppingListId);

  if (items.length) {
    const { error } = await supabase.from("shopping_items").insert(
      items.map((item, index) => ({
        shopping_list_id: shoppingListId,
        category: item.category,
        name: item.name,
        quantity: item.quantity,
        estimated_price: item.estimated_price,
        recommendation_reason: item.recommendation_reason,
        search_query: item.search_query,
        image_url: item.image_url,
        external_url: item.external_url,
        sort_order: index + 1,
      })),
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  await supabase.from("shopping_lists").update({ estimated_total: 0 }).eq("id", shoppingListId);
}

async function syncTasks(
  supabase: SupabaseClient,
  eventId: string,
  generatedTasks: Array<{ title: string; due_label: string; phase: string }>,
) {
  const { data: existingTasksData } = await supabase
    .from("tasks")
    .select("title")
    .eq("event_id", eventId)
    .returns<Array<{ title: string }>>();
  const existingTasks = existingTasksData ?? [];

  const existingTitles = new Set(existingTasks.map((task) => task.title.toLowerCase()));
  const missingTasks = generatedTasks.filter((task) => !existingTitles.has(task.title.toLowerCase()));

  if (missingTasks.length) {
    const { error } = await supabase.from("tasks").insert(
      missingTasks.map((task) => ({
        event_id: eventId,
        title: task.title,
        due_label: task.due_label,
        phase: task.phase,
      })),
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  return missingTasks.length;
}

async function replaceTasks(
  supabase: SupabaseClient,
  eventId: string,
  tasks: Array<{ title: string; due_label: string; phase: string }>,
) {
  await supabase.from("tasks").delete().eq("event_id", eventId);

  if (!tasks.length) {
    return;
  }

  const { error } = await supabase.from("tasks").insert(
    tasks.map((task) => ({
      event_id: eventId,
      title: task.title,
      due_label: task.due_label || null,
      phase: task.phase || null,
    })),
  );

  if (error) {
    throw new Error(error.message);
  }
}

async function syncTimeline(
  supabase: SupabaseClient,
  eventId: string,
  generatedTimeline: Array<{ label: string; detail: string; sort_order: number }>,
) {
  const { data: existingItemsData } = await supabase
    .from("timeline_items")
    .select("label")
    .eq("event_id", eventId)
    .returns<Array<{ label: string }>>();
  const existingItems = existingItemsData ?? [];

  const existingLabels = new Set(existingItems.map((item) => item.label.toLowerCase()));
  const missingItems = generatedTimeline.filter(
    (item) => !existingLabels.has(item.label.toLowerCase()),
  );

  if (missingItems.length) {
    const { error } = await supabase.from("timeline_items").insert(
      missingItems.map((item) => ({
        event_id: eventId,
        label: item.label,
        detail: item.detail,
        sort_order: item.sort_order,
      })),
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  return missingItems.length;
}

async function replaceTimeline(
  supabase: SupabaseClient,
  eventId: string,
  timeline: Array<{ label: string; detail: string; sort_order: number }>,
) {
  await supabase.from("timeline_items").delete().eq("event_id", eventId);

  if (!timeline.length) {
    return;
  }

  const { error } = await supabase.from("timeline_items").insert(
    timeline.map((item, index) => ({
      event_id: eventId,
      label: item.label,
      detail: item.detail,
      sort_order: item.sort_order || index + 1,
    })),
  );

  if (error) {
    throw new Error(error.message);
  }
}

function normalizeStoredPlanSnapshot(value: unknown): StoredPlanSnapshot {
  return storedPlanSnapshotSchema.parse(value);
}

function buildShoppingItemsFromCategories(
  categories: StoredPlanSnapshot["shoppingCategories"],
) {
  return categories.flatMap((category) =>
    category.items.map((item) => ({
      category: category.category,
      name: item.name,
      quantity: item.quantity,
      estimated_price: null,
      recommendation_reason: null,
      search_query: null,
      image_url: null,
      external_url: null,
    })),
  );
}

export async function generatePlanForEvent(
  supabase: SupabaseClient,
  eventId: string,
  options?: { forceRegenerate?: boolean },
) {
  const event = await loadEventSeed(supabase, eventId);
  const fingerprintInput = buildEventFingerprint(event, "party_plan");
  const requestFingerprint = buildFingerprint(fingerprintInput);
  const promptVersion = getPromptVersion("party_plan");
  const model = getOpenAIModel("plan");

  if (!options?.forceRegenerate) {
    const cachedPlan = await loadCachedPlan(
      supabase,
      eventId,
      requestFingerprint,
      promptVersion,
      model,
    );

    if (cachedPlan) {
      await trackGeneration(supabase, {
        userId: event.owner_id,
        eventId,
        generationType: "party_plan",
        model,
        requestFingerprint,
        promptVersion,
        inputTokens: 0,
        outputTokens: 0,
        cachedInputTokens: 0,
        estimatedCostUsd: 0,
        latencyMs: 0,
        status: "cached",
      });

      return {
        theme: cachedPlan.theme ?? getThemeFromEvent(event),
        inviteCopy: cachedPlan.invite_copy ?? "",
        menu: cachedPlan.menu ?? [],
        shoppingCategories: cachedPlan.shopping_categories ?? [],
        shoppingItems: [],
        tasks: cachedPlan.tasks ?? [],
        timeline: cachedPlan.timeline ?? [],
        rawResponse: {
          provider: cachedPlan.raw_response?.provider ?? "party-plan-cache",
          generatedAt: cachedPlan.raw_response?.generatedAt ?? new Date().toISOString(),
          summary: cachedPlan.summary ?? "Returned cached plan from Supabase.",
          model: cachedPlan.model ?? model,
          promptVersion: cachedPlan.prompt_version ?? promptVersion,
          usage: {
            model: cachedPlan.model ?? model,
            promptVersion: cachedPlan.prompt_version ?? promptVersion,
            inputTokens: 0,
            outputTokens: 0,
            cachedInputTokens: 0,
            estimatedCostUsd: 0,
            latencyMs: 0,
            provider: "party-plan-cache",
            usedFallback: false,
          },
        },
        synced: {
          shoppingItemsAdded: 0,
          tasksAdded: 0,
          timelineAdded: 0,
          estimatedTotal: 0,
          cacheHit: true,
        },
      };
    }
  }

  const generated = await generatePartyPlan(event);

  await ensureInvite(supabase, eventId, generated.inviteCopy);

  const shoppingList = await ensureShoppingList(supabase, eventId);
  const shoppingSummary = await syncShoppingItems(supabase, shoppingList.id, generated.shoppingItems);
  const tasksAdded = await syncTasks(supabase, eventId, generated.tasks);
  const timelineAdded = await syncTimeline(supabase, eventId, generated.timeline);

  const { error: planError } = await supabase.from("party_plans").upsert(
    {
      event_id: eventId,
      theme: generated.theme,
      invite_copy: generated.inviteCopy,
      menu: generated.menu,
      shopping_categories: generated.shoppingCategories,
      tasks: generated.tasks,
      timeline: generated.timeline.map(({ label, detail }) => ({ label, detail })),
      raw_response: generated.rawResponse,
      generated_at: new Date().toISOString(),
      request_fingerprint: requestFingerprint,
      prompt_version: generated.rawResponse.promptVersion ?? promptVersion,
      model: generated.rawResponse.model ?? model,
      status: "ready",
      summary: generated.rawResponse.summary,
    },
    { onConflict: "event_id" },
  );

  if (planError) {
    throw new Error(planError.message);
  }

  const usage = generated.rawResponse.usage;
  await trackGeneration(supabase, {
    userId: event.owner_id,
    eventId,
    generationType: "party_plan",
    model: generated.rawResponse.model ?? model,
    requestFingerprint,
    promptVersion: generated.rawResponse.promptVersion ?? promptVersion,
    inputTokens: usage?.inputTokens ?? 0,
    outputTokens: usage?.outputTokens ?? 0,
    cachedInputTokens: usage?.cachedInputTokens ?? 0,
    estimatedCostUsd: usage?.estimatedCostUsd ?? 0,
    latencyMs: usage?.latencyMs ?? 0,
    status: usage?.usedFallback ? "fallback" : "success",
  });

  return {
    theme: generated.theme,
    inviteCopy: generated.inviteCopy,
    menu: generated.menu,
    shoppingCategories: generated.shoppingCategories,
    tasks: generated.tasks,
    timeline: generated.timeline,
    synced: {
      shoppingItemsAdded: shoppingSummary.addedCount,
      tasksAdded,
      timelineAdded,
      estimatedTotal: shoppingSummary.estimatedTotal,
      cacheHit: false,
    },
  };
}

export async function revisePlanForEvent(
  supabase: SupabaseClient,
  eventId: string,
  {
    changeType,
    instructions,
  }: {
    changeType: string;
    instructions: string;
  },
) {
  const event = await loadEventSeed(supabase, eventId);
  const currentPlanRecord = await getCurrentPlanRecord(supabase, eventId);

  if (!currentPlanRecord) {
    return generatePlanForEvent(supabase, eventId, { forceRegenerate: true });
  }

  const currentPlan: GeneratedPartyPlan = {
    theme: currentPlanRecord.theme ?? getThemeFromEvent(event),
    inviteCopy: currentPlanRecord.invite_copy ?? "",
    menu: currentPlanRecord.menu ?? [],
    shoppingCategories: currentPlanRecord.shopping_categories ?? [],
    shoppingItems: [],
    tasks: currentPlanRecord.tasks ?? [],
    timeline: currentPlanRecord.timeline ?? [],
    rawResponse: {
      provider: currentPlanRecord.raw_response?.provider ?? "party-plan-record",
      generatedAt: currentPlanRecord.raw_response?.generatedAt ?? new Date().toISOString(),
      summary: currentPlanRecord.summary ?? "Loaded current plan from Supabase.",
      model: currentPlanRecord.model ?? getOpenAIModel("plan"),
      promptVersion:
        currentPlanRecord.prompt_version ?? getPromptVersion("plan_revision"),
    },
  };

  const revisedPlan = await revisePartyPlan({
    event,
    currentPlan,
    changeType,
    instructions,
  });

  const { data: latestVersion } = await supabase
    .from("plan_versions")
    .select("version_num")
    .eq("plan_id", currentPlanRecord.id)
    .order("version_num", { ascending: false })
    .limit(1)
    .maybeSingle<PlanVersionRecord>();

  await supabase.from("plan_versions").insert({
    plan_id: currentPlanRecord.id,
    version_num: (latestVersion?.version_num ?? 0) + 1,
    change_reason: instructions,
    plan_json: {
      theme: currentPlan.theme,
      inviteCopy: currentPlan.inviteCopy,
      menu: currentPlan.menu,
      shoppingCategories: currentPlan.shoppingCategories,
      tasks: currentPlan.tasks,
      timeline: currentPlan.timeline,
    },
  });

  const fingerprintInput = {
    ...buildEventFingerprint(event, "plan_revision"),
    changeType: changeType.trim().toLowerCase(),
    instructions: instructions.trim().toLowerCase(),
  };
  const requestFingerprint = buildFingerprint(fingerprintInput);
  const promptVersion = revisedPlan.rawResponse.promptVersion ?? getPromptVersion("plan_revision");
  const model = revisedPlan.rawResponse.model ?? getOpenAIModel("plan");

  await ensureInvite(supabase, eventId, revisedPlan.inviteCopy);

  const shoppingList = await ensureShoppingList(supabase, eventId);
  const shoppingSummary = await syncShoppingItems(supabase, shoppingList.id, revisedPlan.shoppingItems);
  const tasksAdded = await syncTasks(supabase, eventId, revisedPlan.tasks);
  const timelineAdded = await syncTimeline(supabase, eventId, revisedPlan.timeline);

  const { error } = await supabase
    .from("party_plans")
    .update({
      theme: revisedPlan.theme,
      invite_copy: revisedPlan.inviteCopy,
      menu: revisedPlan.menu,
      shopping_categories: revisedPlan.shoppingCategories,
      tasks: revisedPlan.tasks,
      timeline: revisedPlan.timeline.map(({ label, detail }) => ({ label, detail })),
      raw_response: revisedPlan.rawResponse,
      generated_at: new Date().toISOString(),
      request_fingerprint: requestFingerprint,
      prompt_version: promptVersion,
      model,
      status: "ready",
      summary: revisedPlan.rawResponse.summary,
    })
    .eq("id", currentPlanRecord.id);

  if (error) {
    throw new Error(error.message);
  }

  const usage = revisedPlan.rawResponse.usage;
  await trackGeneration(supabase, {
    userId: event.owner_id,
    eventId,
    generationType: "plan_revision",
    model,
    requestFingerprint,
    promptVersion,
    inputTokens: usage?.inputTokens ?? 0,
    outputTokens: usage?.outputTokens ?? 0,
    cachedInputTokens: usage?.cachedInputTokens ?? 0,
    estimatedCostUsd: usage?.estimatedCostUsd ?? 0,
    latencyMs: usage?.latencyMs ?? 0,
    status: usage?.usedFallback ? "fallback" : "success",
  });

  return {
    ...revisedPlan,
    synced: {
      shoppingItemsAdded: shoppingSummary.addedCount,
      tasksAdded,
      timelineAdded,
      estimatedTotal: shoppingSummary.estimatedTotal,
      cacheHit: false,
    },
  };
}

export async function restorePlanVersionForEvent(
  supabase: SupabaseClient,
  eventId: string,
  versionId: string,
) {
  const event = await loadEventSeed(supabase, eventId);
  const currentPlanRecord = await getCurrentPlanRecord(supabase, eventId);

  if (!currentPlanRecord) {
    throw new Error("No current plan exists to restore.");
  }

  const { data: versionRecord, error: versionError } = await supabase
    .from("plan_versions")
    .select("id, version_num, change_reason, created_at, plan_json")
    .eq("id", versionId)
    .eq("plan_id", currentPlanRecord.id)
    .maybeSingle<PlanVersionRecord>();

  if (versionError || !versionRecord?.plan_json) {
    throw new Error(versionError?.message ?? "Saved plan version not found.");
  }

  const snapshot = normalizeStoredPlanSnapshot(versionRecord.plan_json);
  const { data: latestVersion } = await supabase
    .from("plan_versions")
    .select("version_num")
    .eq("plan_id", currentPlanRecord.id)
    .order("version_num", { ascending: false })
    .limit(1)
    .maybeSingle<PlanVersionRecord>();

  const currentSnapshot = normalizeStoredPlanSnapshot({
    theme: currentPlanRecord.theme ?? getThemeFromEvent(event),
    inviteCopy: currentPlanRecord.invite_copy ?? "",
    menu: currentPlanRecord.menu ?? [],
    shoppingCategories: currentPlanRecord.shopping_categories ?? [],
    tasks: currentPlanRecord.tasks ?? [],
    timeline: currentPlanRecord.timeline ?? [],
  });

  await supabase.from("plan_versions").insert({
    plan_id: currentPlanRecord.id,
    version_num: (latestVersion?.version_num ?? 0) + 1,
    change_reason: `Restore checkpoint before reverting to version ${versionRecord.version_num}`,
    plan_json: currentSnapshot,
  });

  await ensureInvite(supabase, eventId, snapshot.inviteCopy);

  const shoppingList = await ensureShoppingList(supabase, eventId);
  const restoredItems = buildShoppingItemsFromCategories(snapshot.shoppingCategories);

  await Promise.all([
    replaceShoppingItems(supabase, shoppingList.id, restoredItems),
    replaceTasks(supabase, eventId, snapshot.tasks),
    replaceTimeline(
      supabase,
      eventId,
      snapshot.timeline.map((item, index) => ({
        label: item.label,
        detail: item.detail,
        sort_order: item.sort_order ?? index + 1,
      })),
    ),
  ]);

  const restoredAt = new Date().toISOString();
  const summary = `Restored plan version ${versionRecord.version_num} from ${new Date(
    versionRecord.created_at ?? restoredAt,
  ).toLocaleString("en-US")}.`;

  const { error } = await supabase
    .from("party_plans")
    .update({
      theme: snapshot.theme ?? getThemeFromEvent(event),
      invite_copy: snapshot.inviteCopy,
      menu: snapshot.menu,
      shopping_categories: snapshot.shoppingCategories,
      tasks: snapshot.tasks,
      timeline: snapshot.timeline.map(({ label, detail }) => ({ label, detail })),
      raw_response: {
        provider: "plan-version-restore",
        generatedAt: restoredAt,
        summary,
        restoredFromVersion: versionRecord.version_num,
        sourceChangeReason: versionRecord.change_reason ?? null,
      },
      generated_at: restoredAt,
      status: "ready",
      summary,
    })
    .eq("id", currentPlanRecord.id);

  if (error) {
    throw new Error(error.message);
  }

  return {
    restoredVersion: versionRecord.version_num,
  };
}

export async function generateInviteCopyForEvent(
  supabase: SupabaseClient,
  eventId: string,
) {
  const event = await loadEventSeed(supabase, eventId);
  const inviteRecord = await loadInviteRecord(supabase, eventId);
  const fallbackDesign: InviteDesignData = {
    templateId: "fallback-template",
    packSlug: "fallback-pack",
    categoryKey: event.event_type.trim().toLowerCase(),
    categoryLabel: event.event_type,
    fields: {
      title: event.title,
      subtitle: getThemeFromEvent(event),
      dateText: event.event_date
        ? new Intl.DateTimeFormat("en-US", {
            dateStyle: "full",
            timeStyle: "short",
          }).format(new Date(event.event_date))
        : "Date coming soon",
      locationText: event.location?.trim() || "Location coming soon",
      messageText: "",
      ctaText: "RSVP with your private link",
    },
  };
  const inviteDesign = inviteRecord?.design_json
    ? normalizeInviteDesignData(inviteRecord.design_json, fallbackDesign)
    : fallbackDesign;
  const generated = await generateInviteCopy(event, {
    title: inviteDesign.fields.title,
    subtitle: inviteDesign.fields.subtitle,
    dateText: inviteDesign.fields.dateText,
    locationText: inviteDesign.fields.locationText,
    currentMessage: inviteDesign.fields.messageText,
  });
  const inviteCopy = generated.inviteCopy;
  const fingerprintInput = buildEventFingerprint(event, "invitation_text");
  const requestFingerprint = buildFingerprint(fingerprintInput);
  const promptVersion = generated.rawResponse.promptVersion ?? getPromptVersion("invitation_text");
  const model = generated.rawResponse.model ?? getOpenAIModel("lightweight");

  const inviteId = await ensureInvite(supabase, eventId, inviteCopy);

  if (inviteRecord?.design_json) {
    await supabase
      .from("invites")
      .update({
        design_json: {
          ...inviteDesign,
          fields: {
            ...inviteDesign.fields,
            messageText: inviteCopy,
          },
        },
      })
      .eq("id", inviteId);
  }

  await supabase
    .from("party_plans")
    .upsert(
      {
        event_id: eventId,
        theme: getThemeFromEvent(event),
        invite_copy: inviteCopy,
        generated_at: new Date().toISOString(),
        raw_response: generated.rawResponse,
        request_fingerprint: requestFingerprint,
        prompt_version: promptVersion,
        model,
        status: "ready",
        summary: generated.rawResponse.summary,
      },
      { onConflict: "event_id" },
    );

  const usage = generated.rawResponse.usage;
  await trackGeneration(supabase, {
    userId: event.owner_id,
    eventId,
    generationType: "invitation_text",
    model,
    requestFingerprint,
    promptVersion,
    inputTokens: usage?.inputTokens ?? 0,
    outputTokens: usage?.outputTokens ?? 0,
    cachedInputTokens: usage?.cachedInputTokens ?? 0,
    estimatedCostUsd: usage?.estimatedCostUsd ?? 0,
    latencyMs: usage?.latencyMs ?? 0,
    status: usage?.usedFallback ? "fallback" : "success",
  });

  return { inviteCopy };
}

function getThemeFromEvent(event: EventRecord) {
  return event.theme?.trim() || `${event.event_type} celebration`;
}

export async function generateShoppingListForEvent(supabase: SupabaseClient, eventId: string) {
  const event = await loadEventSeed(supabase, eventId);
  const shoppingList = await ensureShoppingList(supabase, eventId);
  const planContext = await getPlanContextForShopping(supabase, eventId);
  const generated = await generateShoppingList(event, {
    planTheme: planContext?.theme ?? null,
    menu: planContext?.menu ?? [],
    shoppingCategories: planContext?.shopping_categories ?? [],
  });
  const shoppingSummary = await syncShoppingItems(supabase, shoppingList.id, generated.shoppingItems);
  const fingerprintInput = buildEventFingerprint(event, "shopping_list_transform");
  const requestFingerprint = buildFingerprint(fingerprintInput);
  const promptVersion =
    generated.rawResponse.promptVersion ?? getPromptVersion("shopping_list_transform");
  const model = generated.rawResponse.model ?? getOpenAIModel("lightweight");

  await supabase
    .from("party_plans")
    .upsert(
      {
        event_id: eventId,
        theme: getThemeFromEvent(event),
        shopping_categories: generated.shoppingCategories,
        generated_at: new Date().toISOString(),
        raw_response: generated.rawResponse,
        request_fingerprint: requestFingerprint,
        prompt_version: promptVersion,
        model,
        status: "ready",
        summary: generated.rawResponse.summary,
      },
      { onConflict: "event_id" },
    );

  const usage = generated.rawResponse.usage;
  await trackGeneration(supabase, {
    userId: event.owner_id,
    eventId,
    generationType: "shopping_list_transform",
    model,
    requestFingerprint,
    promptVersion,
    inputTokens: usage?.inputTokens ?? 0,
    outputTokens: usage?.outputTokens ?? 0,
    cachedInputTokens: usage?.cachedInputTokens ?? 0,
    estimatedCostUsd: usage?.estimatedCostUsd ?? 0,
    latencyMs: usage?.latencyMs ?? 0,
    status: usage?.usedFallback ? "fallback" : "success",
  });

  return {
    shoppingCategories: generated.shoppingCategories,
    addedCount: shoppingSummary.addedCount,
    estimatedTotal: shoppingSummary.estimatedTotal,
  };
}
