import { NextResponse } from "next/server";
import { buildAiContextForEvent } from "@/lib/ai-context-builder";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "You must be signed in." }, { status: 401 });
  }

  const { eventId } = await context.params;

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("owner_id", user.id)
    .maybeSingle<{ id: string }>();

  if (!event) {
    return NextResponse.json({ ok: false, message: "Event not found." }, { status: 404 });
  }

  try {
    const contextPayload = await buildAiContextForEvent(supabase, eventId);
    return NextResponse.json({ ok: true, eventId, context: contextPayload });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to build AI context." },
      { status: 400 },
    );
  }
}
