import { NextResponse } from "next/server";
import { DEFAULT_TOUR_STATE, normalizeTourState } from "@/lib/tour";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("tour_state")
    .eq("id", user.id)
    .maybeSingle<{ tour_state: unknown }>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!profile) {
    const { error: upsertError } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: user.user_metadata?.full_name ?? user.email,
      tour_state: DEFAULT_TOUR_STATE,
    });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ tour_state: DEFAULT_TOUR_STATE });
  }

  return NextResponse.json({ tour_state: normalizeTourState(profile.tour_state) });
}

