import { NextResponse } from "next/server";
import { z } from "zod";
import { restorePlanVersionForEvent } from "@/lib/ai/workflows";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const restoreSchema = z.object({
  versionId: z.string().uuid(),
});

type RouteContext = {
  params: Promise<{ eventId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { eventId } = await context.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "You must be signed in." }, { status: 401 });
  }

  const payload = restoreSchema.safeParse(await request.json().catch(() => null));

  if (!payload.success) {
    return NextResponse.json({ ok: false, message: "Invalid restore payload." }, { status: 400 });
  }

  try {
    const result = await restorePlanVersionForEvent(supabase, eventId, payload.data.versionId);

    return NextResponse.json({
      ok: true,
      restoredVersion: result.restoredVersion,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to restore that saved plan version.";
    const status = /not found/i.test(message) ? 404 : 400;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
