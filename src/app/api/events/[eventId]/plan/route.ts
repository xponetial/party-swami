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
      "id, theme, invite_copy, menu, shopping_categories, tasks, timeline, model, prompt_version, summary, generated_at",
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
    versions,
  });
}
