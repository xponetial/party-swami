import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { trackAnalyticsEvent } from "@/lib/telemetry";

const bodySchema = z.object({
  action: z.enum(["started", "completed", "abandoned"]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Invalid payload." }, { status: 400 });
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

  const eventName =
    parsed.data.action === "started"
      ? "event_intake_started"
      : parsed.data.action === "completed"
        ? "event_intake_completed"
        : "event_intake_abandoned";

  await trackAnalyticsEvent(supabase, {
    eventName,
    userId: user.id,
    eventId,
    metadata: parsed.data.metadata ?? {},
  });

  return NextResponse.json({ ok: true });
}
