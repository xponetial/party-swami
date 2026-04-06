import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getInviteTemplateCatalog } from "@/lib/invite-template-catalog";

export type AdminRangeDays = 7 | 30 | 90;

type AdminProfile = {
  id: string;
  full_name: string | null;
  plan_tier: string | null;
  phone: string | null;
  created_at: string;
};

type AnalyticsEventRow = {
  id: string;
  user_id: string | null;
  event_id: string | null;
  event_name: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type AuditLogRow = {
  id: string;
  user_id: string | null;
  event_id: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type EventRow = {
  id: string;
  owner_id: string;
  title: string;
  event_type: string;
  event_date: string | null;
  location: string | null;
  guest_target: number | null;
  budget: number | null;
  status: "draft" | "planning" | "ready" | "completed";
  created_at: string;
  updated_at: string;
};

type InviteRow = {
  id: string;
  event_id: string;
  design_json: { templateId?: string; packSlug?: string } | null;
  sent_at: string | null;
  created_at: string;
};

type GuestRow = {
  id: string;
  event_id: string;
  name?: string;
  email?: string | null;
  status: "pending" | "confirmed" | "declined";
  plus_one_count: number;
  last_contacted_at?: string | null;
};

type AiGenerationRow = {
  id: string;
  user_id: string;
  event_id: string | null;
  generation_type: string;
  model: string;
  status: string;
  estimated_cost_usd: number;
  latency_ms: number | null;
  input_tokens: number;
  output_tokens: number;
  cached_input_tokens: number;
  created_at: string;
};

type UsageMonthlyRow = {
  user_id: string;
  usage_month: string;
  requests_count: number;
  input_tokens: number;
  output_tokens: number;
  cached_input_tokens: number;
  estimated_cost_usd: number;
};

type AuthUserLookup = {
  id: string;
  email: string | null;
  createdAt: string | null;
};

export type AdminActivityItem = {
  id: string;
  kind: "analytics" | "audit";
  label: string;
  detail: string;
  eventTitle: string | null;
  createdAt: string;
};

export type AdminOverviewData = {
  metrics: Array<{
    label: string;
    value: string;
    detail: string;
  }>;
  activity: AdminActivityItem[];
  topEventTypes: Array<{ label: string; count: number }>;
  topTemplates: Array<{ label: string; count: number }>;
};

export type AdminAnalyticsData = {
  rangeDays: AdminRangeDays;
  funnel: Array<{
    label: string;
    value: number;
    conversionFromPrevious: number | null;
  }>;
  trendBuckets: Array<{
    bucket: string;
    counts: Record<string, number>;
  }>;
  topEventTypes: Array<{ label: string; count: number }>;
  topTemplates: Array<{ label: string; count: number }>;
  recentAnalytics: AnalyticsEventRow[];
};

export type AdminAiData = {
  rangeDays: AdminRangeDays;
  totals: {
    requests: number;
    estimatedCostUsd: number;
    averageLatencyMs: number;
    fallbackCount: number;
    successRate: number;
    cachedInputTokens: number;
  };
  byModel: Array<{
    model: string;
    requests: number;
    costUsd: number;
    averageLatencyMs: number;
  }>;
  byGenerationType: Array<{
    generationType: string;
    requests: number;
    costUsd: number;
  }>;
  recentFailures: Array<{
    id: string;
    generationType: string;
    model: string;
    status: string;
    estimatedCostUsd: number;
    createdAt: string;
    userEmail: string | null;
    eventTitle: string | null;
  }>;
  monthlyUsage: {
    requestsCount: number;
    estimatedCostUsd: number;
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens: number;
  };
};

export type AdminUserRow = {
  id: string;
  email: string | null;
  fullName: string | null;
  planTier: string;
  phone: string | null;
  eventCount: number;
  monthlyRequests: number;
  monthlyCostUsd: number;
  lastActivityAt: string | null;
  createdAt: string | null;
};

export type AdminEventRow = {
  id: string;
  title: string;
  eventType: string;
  status: string;
  hostName: string | null;
  hostEmail: string | null;
  guestCount: number;
  confirmedSeats: number;
  inviteSentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminTemplateCategorySummary = {
  categoryKey: string;
  categoryLabel: string;
  totalUsage: number;
  templates: Array<{
    templateId: string;
    style: string;
    packSlug: string;
    usageCount: number;
    sentCount: number;
    assetPath: string;
    isActive: boolean;
    notes: string | null;
  }>;
};

export type AdminUserDetail = {
  user: AdminUserRow;
  recentEvents: AdminEventRow[];
  recentAi: AiGenerationRow[];
  recentAiFailures: AiGenerationRow[];
  recentAnalytics: AnalyticsEventRow[];
  recentGuestMessages: Array<{
    id: string;
    eventId: string;
    eventTitle: string;
    guestName: string | null;
    guestEmail: string | null;
    messageType: string;
    channel: string;
    subject: string | null;
    sentAt: string | null;
  }>;
};

export type AdminEventDetail = {
  event: AdminEventRow & {
    ownerId: string;
    budget: number | null;
    location: string | null;
    eventDate: string | null;
    guestTarget: number | null;
  };
  guests: GuestRow[];
  invite: InviteRow | null;
  guestMessages: Array<{
    id: string;
    guest_id: string | null;
    guestName: string | null;
    guestEmail: string | null;
    channel: string;
    message_type: string;
    subject: string | null;
    sent_at: string | null;
    metadata: Record<string, unknown> | null;
  }>;
  analytics: AnalyticsEventRow[];
  aiFailures: AiGenerationRow[];
  planSummary: {
    theme: string | null;
    generatedAt: string | null;
  } | null;
};

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function formatAdminDateTime(value: string | null) {
  if (!value) {
    return "Not yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatAdminCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: value < 1 ? 4 : 2,
  }).format(value);
}

export function normalizeAdminRange(value: string | undefined): AdminRangeDays {
  if (value === "7" || value === "30" || value === "90") {
    return Number(value) as AdminRangeDays;
  }

  return 30;
}

function getRangeStart(rangeDays: AdminRangeDays) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (rangeDays - 1));
  return start.toISOString();
}

function currentUsageMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

function buildDateBuckets(rangeDays: AdminRangeDays) {
  const buckets: string[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (let offset = rangeDays - 1; offset >= 0; offset -= 1) {
    const day = new Date(now);
    day.setDate(now.getDate() - offset);
    buckets.push(day.toISOString().slice(0, 10));
  }

  return buckets;
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function stringifyMetadataValue(value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
}

export const requireAdminAccess = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, plan_tier, phone, created_at")
    .eq("id", user.id)
    .maybeSingle<AdminProfile>();

  if ((profile?.plan_tier ?? "free") !== "admin") {
    redirect("/dashboard");
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    profile,
  };
});

async function listAuthUsers() {
  const supabase = createSupabaseAdminClient();
  const users: AuthUserLookup[] = [];
  let page = 1;
  const perPage = 200;

  while (page <= 10) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw new Error(error.message);
    }

    const batch =
      data?.users.map((user) => ({
        id: user.id,
        email: user.email ?? null,
        createdAt: user.created_at ?? null,
      })) ?? [];

    users.push(...batch);

    if (batch.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

async function getEventTitleById(eventIds: string[]) {
  if (eventIds.length === 0) {
    return new Map<string, string>();
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("events")
    .select("id, title")
    .in("id", eventIds)
    .returns<Array<{ id: string; title: string }>>();

  if (error) {
    throw new Error(error.message);
  }

  return new Map((data ?? []).map((event) => [event.id, event.title] as const));
}

function buildActivityItem(
  entry: AnalyticsEventRow | AuditLogRow,
  kind: "analytics" | "audit",
  eventTitleById: Map<string, string>,
): AdminActivityItem {
  const isAnalytics = kind === "analytics";
  const label = isAnalytics
    ? titleCase((entry as AnalyticsEventRow).event_name)
    : titleCase((entry as AuditLogRow).action);
  const eventTitle = entry.event_id ? eventTitleById.get(entry.event_id) ?? null : null;
  const metadata = entry.metadata ?? {};
  const detailParts = [
    eventTitle,
    stringifyMetadataValue(metadata.status),
    stringifyMetadataValue(metadata.send_mode),
    stringifyMetadataValue(metadata.delivery_type),
  ].filter(Boolean);

  return {
    id: entry.id,
    kind,
    label,
    detail: detailParts.length ? detailParts.join(" | ") : "Account-level activity",
    eventTitle,
    createdAt: entry.created_at,
  };
}

export async function getAdminOverviewMetrics(rangeDays: AdminRangeDays): Promise<AdminOverviewData> {
  const supabase = createSupabaseAdminClient();
  const since = getRangeStart(rangeDays);

  const [
    { count: usersCount = 0 },
    { count: eventsCount = 0 },
    { data: analyticsRows = [] },
    { data: auditRows = [] },
    { data: eventRows = [] },
    { data: inviteRows = [] },
    { data: aiRows = [] },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("events").select("*", { count: "exact", head: true }),
    supabase
      .from("analytics_events")
      .select("id, user_id, event_id, event_name, metadata, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(12)
      .returns<AnalyticsEventRow[]>(),
    supabase
      .from("audit_logs")
      .select("id, user_id, event_id, action, metadata, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(12)
      .returns<AuditLogRow[]>(),
    supabase
      .from("events")
      .select("id, owner_id, title, event_type, event_date, location, guest_target, budget, status, created_at, updated_at")
      .gte("created_at", since)
      .returns<EventRow[]>(),
    supabase
      .from("invites")
      .select("id, event_id, design_json, sent_at, created_at")
      .gte("created_at", since)
      .returns<InviteRow[]>(),
    supabase
      .from("ai_generations")
      .select("id, user_id, event_id, generation_type, model, status, estimated_cost_usd, latency_ms, input_tokens, output_tokens, cached_input_tokens, created_at")
      .gte("created_at", since)
      .returns<AiGenerationRow[]>(),
  ]);

  const analytics = analyticsRows ?? [];
  const audit = auditRows ?? [];
  const events = eventRows ?? [];
  const invites = inviteRows ?? [];
  const aiGenerations = aiRows ?? [];
  const eventIds = Array.from(
    new Set([...analytics, ...audit].map((entry) => entry.event_id).filter((value): value is string => Boolean(value))),
  );
  const eventTitleById = await getEventTitleById(eventIds);

  const activity = [
    ...analytics.map((entry) => buildActivityItem(entry, "analytics", eventTitleById)),
    ...audit.map((entry) => buildActivityItem(entry, "audit", eventTitleById)),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  const eventTypeCounts = events.reduce<Map<string, number>>((map, event) => {
    map.set(event.event_type, (map.get(event.event_type) ?? 0) + 1);
    return map;
  }, new Map());

  const templateCounts = invites.reduce<Map<string, number>>((map, invite) => {
    const templateId = invite.design_json?.templateId;
    const packSlug = invite.design_json?.packSlug;
    if (!templateId || !packSlug) return map;
    const key = `${packSlug}:${templateId}`;
    map.set(key, (map.get(key) ?? 0) + 1);
    return map;
  }, new Map());

  const topEventTypes = [...eventTypeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label, count]) => ({ label, count }));

  const topTemplates = [...templateCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label, count]) => ({ label: label.replace(":", " / "), count }));

  const countByName = (eventName: string) =>
    analytics.filter((entry) => entry.event_name === eventName).length;

  const metrics = [
    { label: "Total users", value: String(usersCount), detail: "Profiles currently stored in Supabase" },
    { label: "Total events", value: String(eventsCount), detail: "Live host workspaces across all owners" },
    { label: "Invites sent", value: String(countByName("invite_sent")), detail: `Recorded in the last ${rangeDays} days` },
    { label: "RSVPs received", value: String(countByName("rsvp_received")), detail: `Public RSVP submissions in the last ${rangeDays} days` },
    { label: "Shopping clicks", value: String(countByName("shopping_link_clicked")), detail: "Affiliate handoff clicks captured from the shopping flow" },
    {
      label: "AI requests",
      value: String(aiGenerations.length),
      detail: `${formatAdminCurrency(
        aiGenerations.reduce((sum, row) => sum + Number(row.estimated_cost_usd ?? 0), 0),
      )} estimated cost`,
    },
  ];

  return {
    metrics,
    activity,
    topEventTypes,
    topTemplates,
  };
}

export async function getAdminAnalyticsMetrics(rangeDays: AdminRangeDays): Promise<AdminAnalyticsData> {
  const supabase = createSupabaseAdminClient();
  const since = getRangeStart(rangeDays);
  const buckets = buildDateBuckets(rangeDays);

  const [{ data: analyticsRows = [] }, { data: eventRows = [] }, { data: inviteRows = [] }] = await Promise.all([
    supabase
      .from("analytics_events")
      .select("id, user_id, event_id, event_name, metadata, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .returns<AnalyticsEventRow[]>(),
    supabase
      .from("events")
      .select("id, owner_id, title, event_type, event_date, location, guest_target, budget, status, created_at, updated_at")
      .gte("created_at", since)
      .returns<EventRow[]>(),
    supabase
      .from("invites")
      .select("id, event_id, design_json, sent_at, created_at")
      .gte("created_at", since)
      .returns<InviteRow[]>(),
  ]);

  const analytics = analyticsRows ?? [];
  const events = eventRows ?? [];
  const invites = inviteRows ?? [];
  const trackedNames = [
    "account_created",
    "event_created",
    "invite_sent",
    "rsvp_received",
    "shopping_link_clicked",
  ] as const;

  const trendBuckets = buckets.map((bucket) => ({
    bucket,
    counts: trackedNames.reduce<Record<string, number>>((acc, name) => {
      acc[name] = 0;
      return acc;
    }, {}),
  }));

  const bucketMap = new Map(trendBuckets.map((bucket) => [bucket.bucket, bucket]));

  for (const entry of analytics) {
    const bucket = bucketMap.get(entry.created_at.slice(0, 10));
    if (!bucket) continue;
    bucket.counts[entry.event_name] = (bucket.counts[entry.event_name] ?? 0) + 1;
  }

  const funnelOrder = [
    { label: "Accounts created", key: "account_created" },
    { label: "Events created", key: "event_created" },
    { label: "Invites sent", key: "invite_sent" },
    { label: "RSVPs received", key: "rsvp_received" },
    { label: "Shopping clicks", key: "shopping_link_clicked" },
  ];

  const funnel = funnelOrder.map((item, index) => {
    const value = analytics.filter((entry) => entry.event_name === item.key).length;
    const previous =
      index === 0
        ? null
        : analytics.filter((entry) => entry.event_name === funnelOrder[index - 1].key).length;

    return {
      label: item.label,
      value,
      conversionFromPrevious: previous && previous > 0 ? Math.round((value / previous) * 100) : null,
    };
  });

  const topEventTypes = [...events.reduce<Map<string, number>>((map, event) => {
    map.set(event.event_type, (map.get(event.event_type) ?? 0) + 1);
    return map;
  }, new Map()).entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, count]) => ({ label, count }));

  const topTemplates = [...invites.reduce<Map<string, number>>((map, invite) => {
    const templateId = invite.design_json?.templateId;
    const packSlug = invite.design_json?.packSlug;
    if (!templateId || !packSlug) return map;
    const key = `${packSlug}:${templateId}`;
    map.set(key, (map.get(key) ?? 0) + 1);
    return map;
  }, new Map()).entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, count]) => ({ label: label.replace(":", " / "), count }));

  return {
    rangeDays,
    funnel,
    trendBuckets: trendBuckets.map((bucket) => ({
      bucket: formatShortDate(bucket.bucket),
      counts: bucket.counts,
    })),
    topEventTypes,
    topTemplates,
    recentAnalytics: analytics.slice(0, 12),
  };
}

export async function getAdminAiMetrics(rangeDays: AdminRangeDays): Promise<AdminAiData> {
  const supabase = createSupabaseAdminClient();
  const since = getRangeStart(rangeDays);
  const usageMonth = currentUsageMonth();

  const [{ data: aiRows = [] }, { data: usageRows = [] }, authUsers, { data: events = [] }] =
    await Promise.all([
      supabase
        .from("ai_generations")
        .select("id, user_id, event_id, generation_type, model, status, estimated_cost_usd, latency_ms, input_tokens, output_tokens, cached_input_tokens, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .returns<AiGenerationRow[]>(),
      supabase
        .from("user_usage_monthly")
        .select("user_id, usage_month, requests_count, input_tokens, output_tokens, cached_input_tokens, estimated_cost_usd")
        .eq("usage_month", usageMonth)
        .returns<UsageMonthlyRow[]>(),
      listAuthUsers(),
      supabase
        .from("events")
        .select("id, owner_id, title, event_type, event_date, location, guest_target, budget, status, created_at, updated_at")
        .returns<EventRow[]>(),
    ]);

  const aiGenerations = aiRows ?? [];
  const usage = usageRows ?? [];
  const userLookup = new Map(authUsers.map((user) => [user.id, user]));
  const eventLookup = new Map((events ?? []).map((event) => [event.id, event]));

  const totalCost = aiGenerations.reduce((sum, row) => sum + Number(row.estimated_cost_usd ?? 0), 0);
  const totalLatency = aiGenerations.reduce((sum, row) => sum + (row.latency_ms ?? 0), 0);
  const latencyCount = aiGenerations.filter((row) => row.latency_ms != null).length;
  const fallbackCount = aiGenerations.filter((row) => row.status !== "success").length;
  const successCount = aiGenerations.filter((row) => row.status === "success").length;

  const byModel = [
    ...aiGenerations.reduce<
      Map<string, { requests: number; costUsd: number; totalLatency: number; latencyCount: number }>
    >((map, row) => {
      const existing = map.get(row.model) ?? {
        requests: 0,
        costUsd: 0,
        totalLatency: 0,
        latencyCount: 0,
      };
      existing.requests += 1;
      existing.costUsd += Number(row.estimated_cost_usd ?? 0);
      existing.totalLatency += row.latency_ms ?? 0;
      existing.latencyCount += row.latency_ms != null ? 1 : 0;
      map.set(row.model, existing);
      return map;
    }, new Map()).entries(),
  ]
    .map(([model, data]) => ({
      model,
      requests: data.requests,
      costUsd: data.costUsd,
      averageLatencyMs: data.latencyCount ? Math.round(data.totalLatency / data.latencyCount) : 0,
    }))
    .sort((a, b) => b.costUsd - a.costUsd);

  const byGenerationType = [
    ...aiGenerations.reduce<Map<string, { requests: number; costUsd: number }>>((map, row) => {
      const existing = map.get(row.generation_type) ?? { requests: 0, costUsd: 0 };
      existing.requests += 1;
      existing.costUsd += Number(row.estimated_cost_usd ?? 0);
      map.set(row.generation_type, existing);
      return map;
    }, new Map()).entries(),
  ]
    .map(([generationType, data]) => ({
      generationType,
      requests: data.requests,
      costUsd: data.costUsd,
    }))
    .sort((a, b) => b.costUsd - a.costUsd);

  const recentFailures = aiGenerations
    .filter((row) => row.status !== "success")
    .slice(0, 10)
    .map((row) => ({
      id: row.id,
      generationType: row.generation_type,
      model: row.model,
      status: row.status,
      estimatedCostUsd: Number(row.estimated_cost_usd ?? 0),
      createdAt: row.created_at,
      userEmail: userLookup.get(row.user_id)?.email ?? null,
      eventTitle: row.event_id ? eventLookup.get(row.event_id)?.title ?? null : null,
    }));

  const monthlyUsage = usage.reduce(
    (acc, row) => {
      acc.requestsCount += row.requests_count ?? 0;
      acc.estimatedCostUsd += Number(row.estimated_cost_usd ?? 0);
      acc.inputTokens += row.input_tokens ?? 0;
      acc.outputTokens += row.output_tokens ?? 0;
      acc.cachedInputTokens += row.cached_input_tokens ?? 0;
      return acc;
    },
    {
      requestsCount: 0,
      estimatedCostUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
      cachedInputTokens: 0,
    },
  );

  return {
    rangeDays,
    totals: {
      requests: aiGenerations.length,
      estimatedCostUsd: totalCost,
      averageLatencyMs: latencyCount ? Math.round(totalLatency / latencyCount) : 0,
      fallbackCount,
      successRate: aiGenerations.length ? Math.round((successCount / aiGenerations.length) * 100) : 0,
      cachedInputTokens: aiGenerations.reduce((sum, row) => sum + (row.cached_input_tokens ?? 0), 0),
    },
    byModel,
    byGenerationType,
    recentFailures,
    monthlyUsage,
  };
}

export async function getAdminUsers(searchQuery: string | undefined) {
  const supabase = createSupabaseAdminClient();
  const usageMonth = currentUsageMonth();

  const [
    { data: profiles = [] },
    { data: usageRows = [] },
    { data: eventRows = [] },
    { data: analyticsRows = [] },
    authUsers,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, plan_tier, phone, created_at")
      .order("created_at", { ascending: false })
      .returns<AdminProfile[]>(),
    supabase
      .from("user_usage_monthly")
      .select("user_id, usage_month, requests_count, input_tokens, output_tokens, cached_input_tokens, estimated_cost_usd")
      .eq("usage_month", usageMonth)
      .returns<UsageMonthlyRow[]>(),
    supabase
      .from("events")
      .select("id, owner_id, title, event_type, event_date, location, guest_target, budget, status, created_at, updated_at")
      .returns<EventRow[]>(),
    supabase
      .from("analytics_events")
      .select("id, user_id, event_id, event_name, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(500)
      .returns<AnalyticsEventRow[]>(),
    listAuthUsers(),
  ]);

  const safeProfiles = profiles ?? [];
  const safeUsageRows = usageRows ?? [];
  const safeEventRows = eventRows ?? [];
  const safeAnalyticsRows = analyticsRows ?? [];
  const usageByUser = new Map(safeUsageRows.map((row) => [row.user_id, row] as const));
  const authByUser = new Map(authUsers.map((user) => [user.id, user] as const));
  const eventCountByUser = safeEventRows.reduce<Map<string, number>>((map, event) => {
    map.set(event.owner_id, (map.get(event.owner_id) ?? 0) + 1);
    return map;
  }, new Map());
  const lastActivityByUser = safeAnalyticsRows.reduce<Map<string, string>>((map, row) => {
    if (!row.user_id || map.has(row.user_id)) return map;
    map.set(row.user_id, row.created_at);
    return map;
  }, new Map());

  const normalizedQuery = searchQuery?.trim().toLowerCase() ?? "";

  return safeProfiles
    .map<AdminUserRow>((profile) => ({
      id: profile.id,
      email: authByUser.get(profile.id)?.email ?? null,
      fullName: profile.full_name,
      planTier: profile.plan_tier ?? "free",
      phone: profile.phone,
      eventCount: eventCountByUser.get(profile.id) ?? 0,
      monthlyRequests: usageByUser.get(profile.id)?.requests_count ?? 0,
      monthlyCostUsd: Number(usageByUser.get(profile.id)?.estimated_cost_usd ?? 0),
      lastActivityAt: lastActivityByUser.get(profile.id) ?? null,
      createdAt: authByUser.get(profile.id)?.createdAt ?? profile.created_at,
    }))
    .filter((row) => {
      if (!normalizedQuery) return true;
      return [row.email, row.fullName, row.phone, row.planTier]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    });
}

export async function getAdminEvents(options: {
  query?: string;
  status?: string;
  eventType?: string;
}) {
  const supabase = createSupabaseAdminClient();
  const [
    { data: events = [] },
    { data: guests = [] },
    { data: invites = [] },
    authUsers,
    { data: profiles = [] },
  ] = await Promise.all([
    supabase
      .from("events")
      .select("id, owner_id, title, event_type, event_date, location, guest_target, budget, status, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .returns<EventRow[]>(),
    supabase
      .from("guests")
      .select("event_id, status, plus_one_count")
      .returns<GuestRow[]>(),
    supabase
      .from("invites")
      .select("id, event_id, design_json, sent_at, created_at")
      .returns<InviteRow[]>(),
    listAuthUsers(),
    supabase
      .from("profiles")
      .select("id, full_name, plan_tier, phone, created_at")
      .returns<AdminProfile[]>(),
  ]);

  const safeEvents = events ?? [];
  const safeGuests = guests ?? [];
  const safeInvites = invites ?? [];
  const safeProfiles = profiles ?? [];
  const inviteByEvent = new Map(safeInvites.map((invite) => [invite.event_id, invite] as const));
  const authByUser = new Map(authUsers.map((user) => [user.id, user] as const));
  const profileByUser = new Map(safeProfiles.map((profile) => [profile.id, profile] as const));
  const guestSummary = safeGuests.reduce<Map<string, { count: number; confirmedSeats: number }>>((map, guest) => {
    const existing = map.get(guest.event_id) ?? { count: 0, confirmedSeats: 0 };
    existing.count += 1;
    if (guest.status === "confirmed") {
      existing.confirmedSeats += 1 + guest.plus_one_count;
    }
    map.set(guest.event_id, existing);
    return map;
  }, new Map());

  const normalizedQuery = options.query?.trim().toLowerCase() ?? "";

  return safeEvents
    .map<AdminEventRow>((event) => ({
      id: event.id,
      title: event.title,
      eventType: event.event_type,
      status: event.status,
      hostName: profileByUser.get(event.owner_id)?.full_name ?? null,
      hostEmail: authByUser.get(event.owner_id)?.email ?? null,
      guestCount: guestSummary.get(event.id)?.count ?? 0,
      confirmedSeats: guestSummary.get(event.id)?.confirmedSeats ?? 0,
      inviteSentAt: inviteByEvent.get(event.id)?.sent_at ?? null,
      createdAt: event.created_at,
      updatedAt: event.updated_at,
    }))
    .filter((row) => (options.status && options.status !== "all" ? row.status === options.status : true))
    .filter((row) => (options.eventType && options.eventType !== "all" ? row.eventType === options.eventType : true))
    .filter((row) => {
      if (!normalizedQuery) return true;
      return [row.title, row.eventType, row.hostName, row.hostEmail]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    });
}

export async function getAdminTemplateMetrics() {
  const supabase = createSupabaseAdminClient();
  const [catalog, { data: invites = [] }, { data: templateControls = [] }] = await Promise.all([
    getInviteTemplateCatalog(true),
    supabase
      .from("invites")
      .select("id, event_id, design_json, sent_at, created_at")
      .returns<InviteRow[]>(),
    supabase
      .from("template_admin_controls")
      .select("pack_slug, template_id, is_active, notes")
      .returns<Array<{ pack_slug: string; template_id: string; is_active: boolean; notes: string | null }>>(),
  ]);

  const safeInvites = invites ?? [];
  const controlByTemplate = new Map(
    (templateControls ?? []).map((control) => [`${control.pack_slug}:${control.template_id}`, control] as const),
  );
  const usageByTemplate = safeInvites.reduce<Map<string, { usageCount: number; sentCount: number }>>((map, invite) => {
    const templateId = invite.design_json?.templateId;
    const packSlug = invite.design_json?.packSlug;
    if (!templateId || !packSlug) return map;
    const key = `${packSlug}:${templateId}`;
    const existing = map.get(key) ?? { usageCount: 0, sentCount: 0 };
    existing.usageCount += 1;
    existing.sentCount += invite.sent_at ? 1 : 0;
    map.set(key, existing);
    return map;
  }, new Map());

  return catalog.map<AdminTemplateCategorySummary>((category) => {
    const templates = category.templates.map((template) => {
      const usage = usageByTemplate.get(`${template.packSlug}:${template.templateId}`);
      return {
        templateId: template.templateId,
        style: template.style,
        packSlug: template.packSlug,
        usageCount: usage?.usageCount ?? 0,
        sentCount: usage?.sentCount ?? 0,
        assetPath: template.assetPath,
        isActive: controlByTemplate.get(`${template.packSlug}:${template.templateId}`)?.is_active ?? true,
        notes: controlByTemplate.get(`${template.packSlug}:${template.templateId}`)?.notes ?? null,
      };
    });

    return {
      categoryKey: category.key,
      categoryLabel: category.label,
      totalUsage: templates.reduce((sum, template) => sum + template.usageCount, 0),
      templates: templates.sort((a, b) => b.usageCount - a.usageCount || a.style.localeCompare(b.style)),
    };
  });
}

export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const supabase = createSupabaseAdminClient();

  const [users, { data: ownedEvents = [] }, { data: aiRows = [] }, { data: analyticsRows = [] }] =
    await Promise.all([
      getAdminUsers(undefined),
      supabase
        .from("events")
        .select("id, owner_id, title, event_type, event_date, location, guest_target, budget, status, created_at, updated_at")
        .eq("owner_id", userId)
        .order("updated_at", { ascending: false })
        .returns<EventRow[]>(),
      supabase
        .from("ai_generations")
        .select("id, user_id, event_id, generation_type, model, status, estimated_cost_usd, latency_ms, input_tokens, output_tokens, cached_input_tokens, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20)
        .returns<AiGenerationRow[]>(),
      supabase
        .from("analytics_events")
        .select("id, user_id, event_id, event_name, metadata, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20)
        .returns<AnalyticsEventRow[]>(),
    ]);

  const user = users.find((entry) => entry.id === userId);
  if (!user) return null;

  const eventIds = (ownedEvents ?? []).map((event) => event.id);
  const [eventRows, authUsers, { data: profiles = [] }, { data: guests = [] }, { data: invites = [] }] =
    await Promise.all([
      Promise.resolve(ownedEvents ?? []),
      listAuthUsers(),
      supabase.from("profiles").select("id, full_name, plan_tier, phone, created_at").returns<AdminProfile[]>(),
      eventIds.length
        ? supabase
            .from("guests")
            .select("id, event_id, name, email, status, plus_one_count, last_contacted_at")
            .in("event_id", eventIds)
            .returns<GuestRow[]>()
        : Promise.resolve({ data: [], error: null }),
      eventIds.length
        ? supabase
            .from("invites")
            .select("id, event_id, design_json, sent_at, created_at")
            .in("event_id", eventIds)
            .returns<InviteRow[]>()
        : Promise.resolve({ data: [], error: null }),
    ]);

  const [{ data: guestMessages = [] }] = await Promise.all([
    eventIds.length
      ? supabase
          .from("guest_messages")
          .select("id, event_id, guest_id, channel, message_type, subject, sent_at")
          .in("event_id", eventIds)
          .order("sent_at", { ascending: false })
          .limit(30)
          .returns<
            Array<{
              id: string;
              event_id: string;
              guest_id: string | null;
              channel: string;
              message_type: string;
              subject: string | null;
              sent_at: string | null;
            }>
          >()
      : Promise.resolve({ data: [], error: null }),
  ]);

  const authByUser = new Map(authUsers.map((authUser) => [authUser.id, authUser] as const));
  const profileByUser = new Map((profiles ?? []).map((profile) => [profile.id, profile] as const));
  const inviteByEvent = new Map((invites ?? []).map((invite) => [invite.event_id, invite] as const));
  const eventTitleById = new Map((eventRows ?? []).map((event) => [event.id, event.title] as const));
  const guestById = new Map((guests ?? []).map((guest) => [guest.id, guest] as const));
  const guestSummary = (guests ?? []).reduce<Map<string, { count: number; confirmedSeats: number }>>(
    (map, guest) => {
      const existing = map.get(guest.event_id) ?? { count: 0, confirmedSeats: 0 };
      existing.count += 1;
      if (guest.status === "confirmed") {
        existing.confirmedSeats += 1 + guest.plus_one_count;
      }
      map.set(guest.event_id, existing);
      return map;
    },
    new Map(),
  );

  const recentEvents = (eventRows ?? []).map<AdminEventRow>((event) => ({
    id: event.id,
    title: event.title,
    eventType: event.event_type,
    status: event.status,
    hostName: profileByUser.get(event.owner_id)?.full_name ?? null,
    hostEmail: authByUser.get(event.owner_id)?.email ?? null,
    guestCount: guestSummary.get(event.id)?.count ?? 0,
    confirmedSeats: guestSummary.get(event.id)?.confirmedSeats ?? 0,
    inviteSentAt: inviteByEvent.get(event.id)?.sent_at ?? null,
    createdAt: event.created_at,
    updatedAt: event.updated_at,
  }));

  return {
    user,
    recentEvents,
    recentAi: aiRows ?? [],
    recentAiFailures: (aiRows ?? []).filter((generation) => generation.status !== "success").slice(0, 8),
    recentAnalytics: analyticsRows ?? [],
    recentGuestMessages: (guestMessages ?? []).map((message) => ({
      id: message.id,
      eventId: message.event_id,
      eventTitle: eventTitleById.get(message.event_id) ?? "Unknown event",
      guestName: message.guest_id ? guestById.get(message.guest_id)?.name ?? null : null,
      guestEmail: message.guest_id ? guestById.get(message.guest_id)?.email ?? null : null,
      messageType: message.message_type,
      channel: message.channel,
      subject: message.subject,
      sentAt: message.sent_at,
    })),
  };
}

export async function getAdminEventDetail(eventId: string): Promise<AdminEventDetail | null> {
  const supabase = createSupabaseAdminClient();
  const [
    { data: event },
    { data: guests = [] },
    { data: invite },
    { data: guestMessages = [] },
    { data: analytics = [] },
    { data: aiFailures = [] },
    { data: plan },
  ] = await Promise.all([
    supabase
      .from("events")
      .select("id, owner_id, title, event_type, event_date, location, guest_target, budget, status, created_at, updated_at")
      .eq("id", eventId)
      .maybeSingle<EventRow>(),
    supabase
      .from("guests")
      .select("id, event_id, name, email, status, plus_one_count, last_contacted_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true })
      .returns<GuestRow[]>(),
    supabase
      .from("invites")
      .select("id, event_id, design_json, sent_at, created_at")
      .eq("event_id", eventId)
      .maybeSingle<InviteRow>(),
    supabase
      .from("guest_messages")
      .select("id, guest_id, channel, message_type, subject, sent_at, metadata")
      .eq("event_id", eventId)
      .order("sent_at", { ascending: false })
      .limit(30)
      .returns<
        Array<{
          id: string;
          guest_id: string | null;
          channel: string;
          message_type: string;
          subject: string | null;
          sent_at: string | null;
          metadata: Record<string, unknown> | null;
        }>
      >(),
    supabase
      .from("analytics_events")
      .select("id, user_id, event_id, event_name, metadata, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(30)
      .returns<AnalyticsEventRow[]>(),
    supabase
      .from("ai_generations")
      .select("id, user_id, event_id, generation_type, model, status, estimated_cost_usd, latency_ms, input_tokens, output_tokens, cached_input_tokens, created_at")
      .eq("event_id", eventId)
      .neq("status", "success")
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<AiGenerationRow[]>(),
    supabase
      .from("party_plans")
      .select("theme, generated_at")
      .eq("event_id", eventId)
      .maybeSingle<{ theme: string | null; generated_at: string | null }>(),
  ]);

  if (!event) return null;

  const [events, authUsers, { data: profiles = [] }] = await Promise.all([
    getAdminEvents({}),
    listAuthUsers(),
    supabase.from("profiles").select("id, full_name, plan_tier, phone, created_at").returns<AdminProfile[]>(),
  ]);

  const authByUser = new Map(authUsers.map((user) => [user.id, user] as const));
  const profileByUser = new Map((profiles ?? []).map((profile) => [profile.id, profile] as const));
  const guestById = new Map((guests ?? []).map((guest) => [guest.id, guest] as const));
  const matching = events.find((entry) => entry.id === eventId);
  const base =
    matching ??
    ({
      id: event.id,
      title: event.title,
      eventType: event.event_type,
      status: event.status,
      hostName: profileByUser.get(event.owner_id)?.full_name ?? null,
      hostEmail: authByUser.get(event.owner_id)?.email ?? null,
      guestCount: (guests ?? []).length,
      confirmedSeats: (guests ?? []).reduce(
        (sum, guest) => sum + (guest.status === "confirmed" ? 1 + guest.plus_one_count : 0),
        0,
      ),
      inviteSentAt: invite?.sent_at ?? null,
      createdAt: event.created_at,
      updatedAt: event.updated_at,
    } satisfies AdminEventRow);

  return {
    event: {
      ...base,
      ownerId: event.owner_id,
      budget: event.budget,
      location: event.location,
      eventDate: event.event_date,
      guestTarget: event.guest_target,
    },
    guests: guests ?? [],
    invite: invite ?? null,
    guestMessages: (guestMessages ?? []).map((message) => ({
      ...message,
      guestName: message.guest_id ? guestById.get(message.guest_id)?.name ?? null : null,
      guestEmail: message.guest_id ? guestById.get(message.guest_id)?.email ?? null : null,
    })),
    analytics: analytics ?? [],
    aiFailures: aiFailures ?? [],
    planSummary: plan ? { theme: plan.theme, generatedAt: plan.generated_at } : null,
  };
}
