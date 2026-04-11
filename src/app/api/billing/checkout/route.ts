import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProMonthlyPriceId, getStripeClient } from "@/lib/billing/stripe";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "You must be signed in to upgrade." }, { status: 401 });
  }

  const stripe = getStripeClient();
  const proMonthlyPriceId = getProMonthlyPriceId();

  if (!stripe || !proMonthlyPriceId) {
    return NextResponse.json(
      {
        ok: false,
        message: "Stripe billing is not configured yet.",
      },
      { status: 503 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle<{ stripe_customer_id: string | null }>();

  // Always return to the same origin that initiated checkout so auth cookies stay valid.
  const baseUrl = new URL(request.url).origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: proMonthlyPriceId, quantity: 1 }],
      customer: profile?.stripe_customer_id || undefined,
      customer_email: profile?.stripe_customer_id ? undefined : user.email ?? undefined,
      allow_promotion_codes: true,
      success_url: `${baseUrl}/dashboard?billing=success`,
      cancel_url: `${baseUrl}/pricing?billing=cancelled`,
      metadata: {
        supabase_user_id: user.id,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
        },
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
    console.error("Failed to create Stripe checkout session", {
      userId: user.id,
      message: error instanceof Error ? error.message : "unknown",
    });

    return NextResponse.json(
      { ok: false, message: "Unable to start checkout right now. Please try again." },
      { status: 500 },
    );
  }
}
