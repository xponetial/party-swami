import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/billing/stripe";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "You must be signed in to manage billing." }, { status: 401 });
  }

  const stripe = getStripeClient();
  if (!stripe) {
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

  if (!profile?.stripe_customer_id) {
    return NextResponse.json(
      {
        ok: false,
        message: "No billing account found yet. Start with an upgrade checkout first.",
      },
      { status: 404 },
    );
  }

  const baseUrl = new URL(request.url).origin;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${baseUrl}/billing/refresh`,
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (error) {
    console.error("Failed to create Stripe billing portal session", {
      userId: user.id,
      message: error instanceof Error ? error.message : "unknown",
    });

    return NextResponse.json(
      { ok: false, message: "Unable to open billing right now. Please try again." },
      { status: 500 },
    );
  }
}
