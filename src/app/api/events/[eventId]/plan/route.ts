import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { eventId } = await context.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "You must be signed in." }, { status: 401 });
  }

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle<{ id: string }>();

  if (!event) {
    return NextResponse.json({ ok: false, message: "Event not found." }, { status: 404 });
  }

  const { data: plan } = await supabase
    .from("party_plans")
    .select(
      "id, theme, invite_copy, menu, shopping_categories, tasks, timeline, model, prompt_version, summary, generated_at, raw_response",
    )
    .eq("event_id", eventId)
    .maybeSingle<{
      id: string;
      theme: string | null;
      invite_copy: string | null;
      menu: string[] | null;
      shopping_categories:
        | Array<{ category: string; items: Array<{ name: string; quantity: number }> }>
        | null;
      tasks: Array<{ title: string; due_label: string; phase?: string }> | null;
      timeline: Array<{ label: string; detail: string }> | null;
      model: string | null;
      prompt_version: string | null;
      summary: string | null;
      generated_at: string | null;
      raw_response:
        | {
            ai_brain?: {
              version?: string;
              one_click_generated_at?: string;
              replan?: {
                trigger: "forced" | "context_change" | "none";
                changed_fields: string[];
                impacted_agents: string[];
              };
              handoffs?: Array<{
                from: string;
                to: string[];
                reason: string;
              }>;
              agent_state?: {
                version: "agent-state-v1";
                generated_at: string;
                decision_mode: "approve" | "full_auto";
                event_context: {
                  event_type: string;
                  location: string | null;
                  has_location: boolean;
                  budget: number | null;
                  guest_target: number | null;
                  theme: string | null;
                  vendor_flow_enabled: boolean;
                };
                execution: {
                  invoked_agents: string[];
                  standby_agents: string[];
                };
                active_sections: string[];
                constraints: {
                  deterministic_outputs: true;
                  no_invented_pricing_or_vendor_facts: true;
                };
              };
              agent_invocations?: Array<{
                agent_id: string;
                status: "invoked" | "standby";
                reason: string;
                wired_to: string[];
              }>;
              proposed_actions?: Array<{
                target: "shopping" | "vendors";
                reason: string;
                impact: string;
              }>;
              agent_artifacts?: Record<string, unknown>;
              agent_metrics?: Array<{
                agent_id: string;
                status: "invoked" | "standby";
                latency_ms: number;
                adjustment_count: number;
                acceptance_signal: "auto_applied" | "pending_approval" | "standby";
              }>;
            };
          }
        | null;
    }>();

  if (!plan) {
    return NextResponse.json({ ok: false, message: "Plan not found." }, { status: 404 });
  }

  const { data: versions = [] } = await supabase
    .from("plan_versions")
    .select("id, version_num, change_reason, created_at")
    .eq("plan_id", plan.id)
    .order("created_at", { ascending: false })
    .limit(10)
    .returns<
      Array<{
        id: string;
        version_num: number;
        change_reason: string | null;
        created_at: string;
      }>
    >();

  return NextResponse.json({
    ok: true,
    plan,
    replan: plan.raw_response?.ai_brain?.replan ?? null,
    handoffs: plan.raw_response?.ai_brain?.handoffs ?? [],
    agent_state: plan.raw_response?.ai_brain?.agent_state ?? null,
    agent_invocations: plan.raw_response?.ai_brain?.agent_invocations ?? [],
    proposed_actions: plan.raw_response?.ai_brain?.proposed_actions ?? [],
    agent_artifacts: plan.raw_response?.ai_brain?.agent_artifacts ?? {},
    agent_metrics: plan.raw_response?.ai_brain?.agent_metrics ?? [],
    versions,
  });
}
