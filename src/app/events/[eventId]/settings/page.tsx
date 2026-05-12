import { restorePlanVersionAction, updateDecisionModeAction, updateProfileAction } from "@/app/events/actions";
import { getAiUsageForUser } from "@/lib/ai/usage";
import { ManageBillingButton } from "@/components/billing/manage-billing-button";
import { ProUpgradeButton } from "@/components/billing/pro-upgrade-button";
import { AppShell } from "@/components/layout/app-shell";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function formatBillingStatus(value: string | null | undefined) {
  if (!value) {
    return "Not started";
  }

  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function EventSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams?: Promise<{ restoreError?: string; restoreSuccess?: string }>;
}) {
  const { eventId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const supabase = await createSupabaseServerClient();
  const [{ data: event }, { data: profile }, { data: plan }, { data: planVersions = [] }] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, event_type, status, budget, theme, ai_decision_mode")
      .eq("id", eventId)
      .single<{
        id: string;
        title: string;
        event_type: string;
        status: "draft" | "planning" | "ready" | "completed";
        budget: number | null;
        theme: string | null;
        ai_decision_mode: "approve" | "full_auto" | null;
      }>(),
    supabase
      .from("profiles")
      .select("id, full_name, plan_tier, billing_status, stripe_customer_id")
      .maybeSingle<{
        id: string;
        full_name: string | null;
        plan_tier: string | null;
        billing_status: string | null;
        stripe_customer_id: string | null;
      }>(),
    supabase
      .from("party_plans")
      .select("id, theme, model, prompt_version, summary, generated_at, raw_response")
      .eq("event_id", eventId)
      .maybeSingle<{
        id: string;
        theme: string | null;
        model: string | null;
        prompt_version: string | null;
        summary: string | null;
        generated_at: string | null;
        raw_response?: {
          ai_brain?: {
            agent_invocations?: Array<{
              agent_id: string;
              status: "invoked" | "standby";
              reason: string;
              wired_to: string[];
            }>;
            agent_metrics?: Array<{
              agent_id: string;
              status: "invoked" | "standby";
              latency_ms: number;
              adjustment_count: number;
              acceptance_signal: "auto_applied" | "pending_approval" | "standby";
            }>;
          };
        } | null;
      }>(),
    supabase
      .from("party_plans")
      .select("id")
      .eq("event_id", eventId)
      .maybeSingle<{ id: string }>()
      .then(async ({ data: planIdentity }) => {
        if (!planIdentity?.id) return { data: [] as Array<{ id: string; version_num: number; change_reason: string | null; created_at: string }> };
        return supabase
          .from("plan_versions")
          .select("id, version_num, change_reason, created_at")
          .eq("plan_id", planIdentity.id)
          .order("created_at", { ascending: false })
          .limit(5)
          .returns<Array<{ id: string; version_num: number; change_reason: string | null; created_at: string }>>();
      }),
  ]);
  if (!event) {
    return null;
  }
  const planVersionsSafe = planVersions ?? [];
  const usage = profile?.id ? await getAiUsageForUser(supabase, profile.id) : null;
  const planTier = profile?.plan_tier ?? usage?.planTier ?? "free";
  const canManageBilling =
    Boolean(profile?.stripe_customer_id) && (planTier === "pro" || planTier === "admin");
  const agentInvocations = plan?.raw_response?.ai_brain?.agent_invocations ?? [];
  const invokedCount = agentInvocations.filter((agent) => agent.status === "invoked").length;
  const standbyCount = agentInvocations.filter((agent) => agent.status === "standby").length;
  const decisionMode = event.ai_decision_mode ?? "approve";
  const agentMetrics = plan?.raw_response?.ai_brain?.agent_metrics ?? [];

  return (
    <AppShell
      title="Security and settings"
      description="Profile, privacy, event visibility, and trust-oriented controls grounded in live Supabase data."
      backHref={`/events/${eventId}`}
      eventNav={{ eventId, eventTitle: event.title, active: "settings" }}
    >
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card data-tour-id="settings-account">
          <h2 className="text-xl font-semibold text-ink">Account and security</h2>
          <form action={updateProfileAction} className="mt-5 space-y-4">
            <input type="hidden" name="eventId" value={eventId} />
            <div className="space-y-2">
              <Label htmlFor="full-name">Profile name</Label>
              <Input
                id="full-name"
                name="fullName"
                defaultValue={profile?.full_name ?? ""}
                placeholder="Jordan Lee"
                required
              />
            </div>
            <SubmitButton pendingLabel="Saving profile..." variant="secondary">
              Save profile
            </SubmitButton>
          </form>
          <div className="mt-5 grid gap-3">
            {[
              ["Event", event.title],
              ["Type", event.event_type],
              ["Status", event.status],
              ["Budget", event.budget != null ? `$${event.budget}` : "Not set"],
              ["Plan tier", profile?.plan_tier ?? "free"],
              ["Billing status", formatBillingStatus(profile?.billing_status)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-3xl border border-border bg-white/80 px-4 py-4">
                <p className="text-sm text-ink-muted">{label}</p>
                <p className="text-sm font-medium text-ink">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {canManageBilling ? <ManageBillingButton /> : <ProUpgradeButton />}
            <Button asChild variant="secondary">
              <Link href="/pricing">View plans</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/events/${eventId}/intake`}>Enhanced questions</Link>
            </Button>
          </div>
        </Card>

        <Card data-tour-id="settings-privacy" className="bg-[rgba(244,247,255,0.9)]">
          <h2 className="text-xl font-semibold text-ink">Privacy and consent</h2>
          <div className="mt-5 grid gap-3">
            {[
              "Guest data remains protected by row-level security and is only visible to the owning host session.",
              "Invite sharing is controlled by the event's public invite toggle and per-event public slug.",
              "Subscription state is synced from Stripe webhooks into your profile for plan enforcement and admin reporting.",
              "Profile updates on this screen write directly to the Supabase profiles table.",
            ].map((item) => (
              <div key={item} className="rounded-3xl border border-border bg-white/85 p-4 text-sm leading-6 text-ink-muted">
                {item}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card data-tour-id="settings-ai-status">
          <h2 className="text-xl font-semibold text-ink">AI planning status</h2>
          <div className="mt-5 grid gap-3">
            {[
              ["Current theme", plan?.theme ?? event.theme ?? "Not generated yet"],
              ["AI model", plan?.model ?? "Not stored yet"],
              ["Prompt version", plan?.prompt_version ?? "Not stored yet"],
              ["Last generated", plan?.generated_at ? new Date(plan.generated_at).toLocaleString("en-US") : "Not generated yet"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-3xl border border-border bg-white/80 px-4 py-4">
                <p className="text-sm text-ink-muted">{label}</p>
                <p className="text-sm font-medium text-ink">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-3xl border border-border bg-canvas p-4 text-sm leading-6 text-ink-muted">
            {plan?.summary ??
              "Generate or revise a plan to start tracking model, prompt version, and revision metadata here."}
          </div>
          {usage ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-border bg-white/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Tier</p>
                <p className="mt-2 text-lg font-semibold capitalize text-ink">{usage.planTier}</p>
              </div>
              <div className="rounded-3xl border border-border bg-white/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Requests left</p>
                <p className="mt-2 text-lg font-semibold text-ink">{usage.remaining.requests}</p>
              </div>
            </div>
          ) : null}
        </Card>

        <Card data-tour-id="settings-plan-revisions" className="bg-[rgba(244,247,255,0.9)]">
          <h2 className="text-xl font-semibold text-ink">Recent plan revisions</h2>
          {resolvedSearchParams.restoreSuccess ? (
            <div className="mt-4 rounded-3xl border border-accent/20 bg-accent-soft px-4 py-3 text-sm text-accent">
              Restored saved plan version {resolvedSearchParams.restoreSuccess}. The event workspace now reflects that snapshot.
            </div>
          ) : null}
          {resolvedSearchParams.restoreError ? (
            <div className="mt-4 rounded-3xl border border-brand/20 bg-brand/10 px-4 py-3 text-sm text-brand">
              {resolvedSearchParams.restoreError}
            </div>
          ) : null}
          <div className="mt-5 grid gap-3">
            {planVersionsSafe.length ? (
              planVersionsSafe.map((version) => (
                <div key={version.id} className="rounded-3xl border border-border bg-white/85 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-ink">Version {version.version_num}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">
                      {new Date(version.created_at).toLocaleString("en-US")}
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-ink-muted">
                    {version.change_reason ?? "Saved snapshot before a new AI-generated plan update."}
                  </p>
                  <form action={restorePlanVersionAction} className="mt-4">
                    <input type="hidden" name="eventId" value={eventId} />
                    <input type="hidden" name="versionId" value={version.id} />
                    <SubmitButton pendingLabel={`Restoring version ${version.version_num}...`} variant="secondary">
                      Restore this version
                    </SubmitButton>
                  </form>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-border bg-white/85 p-4 text-sm leading-6 text-ink-muted">
                No saved revisions yet. Once you revise an AI plan, earlier versions will appear here so the host can track the change history.
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card data-tour-id="settings-agent-orchestration">
        <h2 className="text-xl font-semibold text-ink">Agent orchestration</h2>
        <form action={updateDecisionModeAction} className="mt-4 flex items-end gap-3">
          <input type="hidden" name="eventId" value={eventId} />
          <div className="space-y-2">
            <Label htmlFor="decisionMode">Decision mode</Label>
            <select id="decisionMode" name="decisionMode" defaultValue={decisionMode} className="rounded-2xl border border-border bg-white px-3 py-2 text-sm text-ink">
              <option value="approve">Approve (proposed actions)</option>
              <option value="full_auto">Full auto (apply safe actions)</option>
            </select>
          </div>
          <SubmitButton pendingLabel="Saving mode..." variant="secondary">Save mode</SubmitButton>
        </form>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-border bg-white/85 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Total agents</p>
            <p className="mt-2 text-lg font-semibold text-ink">{agentInvocations.length || 0}</p>
          </div>
          <div className="rounded-3xl border border-border bg-white/85 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Invoked</p>
            <p className="mt-2 text-lg font-semibold text-ink">{invokedCount}</p>
          </div>
          <div className="rounded-3xl border border-border bg-white/85 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Standby</p>
            <p className="mt-2 text-lg font-semibold text-ink">{standbyCount}</p>
          </div>
        </div>
        <div className="mt-5 rounded-3xl border border-border bg-white/85 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Decision mode behavior</p>
          <p className="mt-2 text-sm text-ink-muted">
            {decisionMode === "full_auto"
              ? "Safe budget and vendor substitutions are auto-applied during one-click runs."
              : "Budget and vendor substitutions are proposed and require approval before manual application."}
          </p>
        </div>
        {agentMetrics.length ? (
          <div className="mt-5 grid gap-3">
            {agentMetrics.map((metric) => (
              <div key={`${metric.agent_id}:${metric.status}`} className="rounded-3xl border border-border bg-white/85 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink">{metric.agent_id}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">{metric.acceptance_signal}</p>
                </div>
                <p className="mt-2 text-xs text-ink-muted">
                  Latency: {metric.latency_ms}ms · Adjustments: {metric.adjustment_count} · Status: {metric.status}
                </p>
              </div>
            ))}
          </div>
        ) : null}
        <div className="mt-5 grid gap-3">
          {agentInvocations.length ? (
            agentInvocations.map((agent) => (
              <div key={agent.agent_id} className="rounded-3xl border border-border bg-white/85 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">{agent.agent_id}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">{agent.status}</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{agent.reason}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-ink-muted">Wired to</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {agent.wired_to.map((target) => (
                    <span key={`${agent.agent_id}:${target}`} className="rounded-full border border-border bg-canvas px-3 py-1 text-xs text-ink-muted">
                      {target}
                    </span>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-border bg-white/85 p-4 text-sm leading-6 text-ink-muted">
              No agent invocation metadata yet. Generate an AI plan from one-click or plan-event to populate this panel.
            </div>
          )}
        </div>
      </Card>
    </AppShell>
  );
}
