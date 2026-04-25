import { NextResponse } from "next/server";
import { mergeTourState, TOUR_STEP_COUNT } from "@/lib/tour";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data: profile, error: readError } = await supabase
    .from("profiles")
    .select("tour_state")
    .eq("id", user.id)
    .maybeSingle<{ tour_state: unknown }>();

  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }

  const tourState = mergeTourState(profile?.tour_state, {
    started: true,
    completed: true,
    skipped: false,
    current_step: TOUR_STEP_COUNT - 1,
  });

  const { error: updateError } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      full_name: user.user_metadata?.full_name ?? user.email,
      tour_state: tourState,
    });

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ tour_state: tourState });
}
