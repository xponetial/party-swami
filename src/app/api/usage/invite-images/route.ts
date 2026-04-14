import { NextResponse } from "next/server";
import { getInviteImageUsageForUser } from "@/lib/ai/usage";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_tier")
    .eq("id", user.id)
    .maybeSingle<{ plan_tier: string | null }>();

  const tier = profile?.plan_tier === "admin" ? "admin" : profile?.plan_tier === "pro" ? "pro" : null;

  if (!tier) {
    return NextResponse.json({
      ok: true,
      usage: {
        usageMonth: "",
        monthlyBudgetUsd: 0,
        usedBudgetUsd: 0,
        remainingBudgetUsd: 0,
        baseMonthlyBudgetUsd: 0,
        additionalBudgetUsd: 0,
        generatedImagesCount: 0,
        baseMonthlyImageCap: 0,
        additionalImagesPurchased: 0,
        monthlyImageCap: 0,
        imagesLeftThisMonth: 0,
        purchasedImagePackCount: 0,
      },
    });
  }

  const usage = await getInviteImageUsageForUser(supabase, user.id, tier);
  return NextResponse.json({ ok: true, usage });
}
