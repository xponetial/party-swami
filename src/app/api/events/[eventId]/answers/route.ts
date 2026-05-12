import { NextResponse } from "next/server";
import { saveAnswersSchema } from "@/features/event-intelligence/schemas";
import { upsertEventAnswers } from "@/features/event-intelligence/services/event-intelligence";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { trackAnalyticsEvent } from "@/lib/telemetry";

export async function POST(
  request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  const body = await request.json().catch(() => null);
  const parsed = saveAnswersSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid answers payload." },
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
    await upsertEventAnswers(supabase, eventId, parsed.data.answers);

    const completedSections = parsed.data.completedSections ?? [];
    await trackAnalyticsEvent(supabase, {
      eventName: "event_intake_section_completed",
      userId: user.id,
      eventId,
      metadata: {
        answer_count: parsed.data.answers.length,
        completed_sections_count: completedSections.length,
      },
    });
    for (const sectionName of completedSections) {
      await trackAnalyticsEvent(supabase, {
        eventName: "event_intake_section_completed",
        userId: user.id,
        eventId,
        metadata: {
          section_name: sectionName,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to save answers." },
      { status: 400 },
    );
  }
}
