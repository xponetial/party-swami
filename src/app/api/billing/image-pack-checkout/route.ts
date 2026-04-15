import { NextResponse } from "next/server";
import {
  getImagePackPriceId,
  getStripeClient,
} from "@/lib/billing/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function monthBucket() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "You must be signed in." }, { status: 401 });
  }

  const stripe = getStripeClient();
  const imagePackPriceId = getImagePackPriceId();

  if (!stripe || !imagePackPriceId) {
    return NextResponse.json(
      { ok: false, message: "Image pack billing is not configured yet." },
      { status: 503 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_tier, stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle<{ plan_tier: string | null; stripe_customer_id: string | null }>();

  const isPaidPlan = profile?.plan_tier === "pro" || profile?.plan_tier === "admin";
  if (!isPaidPlan) {
    return NextResponse.json(
      { ok: false, message: "Image packs are available for Pro and Admin accounts." },
      { status: 403 },
    );
  }

  const baseUrl = new URL(request.url).origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: imagePackPriceId, quantity: 1 }],
      customer: profile?.stripe_customer_id || undefined,
      customer_email: profile?.stripe_customer_id ? undefined : user.email ?? undefined,
      allow_promotion_codes: false,
      success_url: `${baseUrl}/billing/image-pack-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/billing?billing=image_pack_cancelled`,
      metadata: {
        supabase_user_id: user.id,
        checkout_kind: "image_pack",
        usage_month: monthBucket(),
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { ok: false, message: "Stripe checkout URL is unavailable right now." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, url: session.url });
  } catch (error) {
    console.error("Failed to create image pack checkout session", {
      userId: user.id,
      message: error instanceof Error ? error.message : "unknown",
    });

    return NextResponse.json(
      { ok: false, message: "Unable to start image pack checkout right now. Please try again." },
      { status: 500 },
    );
  }
}
