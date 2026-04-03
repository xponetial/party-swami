import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAuditLog, trackAnalyticsEvent } from "@/lib/telemetry";

const querySchema = z.object({
  eventId: z.string().uuid(),
  itemId: z.string().uuid(),
  target: z.url().refine((value) => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }, "Invalid redirect target."),
});

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const parsed = querySchema.safeParse({
    eventId: requestUrl.searchParams.get("eventId"),
    itemId: requestUrl.searchParams.get("itemId"),
    target: requestUrl.searchParams.get("target"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: parsed.error.issues[0]?.message ?? "Invalid affiliate click parameters.",
      },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await Promise.all([
    trackAnalyticsEvent(supabase, {
      eventName: "shopping_link_clicked",
      userId: user?.id ?? null,
      eventId: parsed.data.eventId,
      metadata: {
        item_id: parsed.data.itemId,
        target: parsed.data.target,
        source: "shopping_recommendation_card",
      },
    }),
    createAuditLog(supabase, {
      action: "shopping_link_clicked",
      userId: user?.id ?? null,
      eventId: parsed.data.eventId,
      metadata: {
        item_id: parsed.data.itemId,
        target: parsed.data.target,
        source: "shopping_recommendation_card",
      },
    }),
  ]);

  return NextResponse.redirect(parsed.data.target, { status: 307 });
}
