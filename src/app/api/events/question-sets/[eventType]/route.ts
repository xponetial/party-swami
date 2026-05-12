import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadEventQuestionSections } from "@/features/event-intelligence/services/event-intelligence";

export async function GET(
  _request: Request,
  context: { params: Promise<{ eventType: string }> },
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "You must be signed in." }, { status: 401 });
  }

  const { eventType } = await context.params;

  try {
    const sections = await loadEventQuestionSections(supabase, eventType);
    return NextResponse.json({ ok: true, eventType, sections });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Unable to load question sets." },
      { status: 400 },
    );
  }
}
