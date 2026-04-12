import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPlanTierFromSubscription, getStripeClient } from "@/lib/billing/stripe";

function isCancellationScheduled(subscription: Stripe.Subscription) {
  const hasFutureCancel =
    typeof subscription.cancel_at === "number" && subscription.cancel_at * 1000 > Date.now();
  return subscription.cancel_at_period_end || hasFutureCancel;
}

function pickBestSubscription(subscriptions: Stripe.Subscription[]) {
  if (subscriptions.length === 0) {
    return null;
  }

  const sorted = [...subscriptions].sort((a, b) => b.created - a.created);
  const activeOrTrialing = sorted.filter(
    (subscription) => subscription.status === "active" || subscription.status === "trialing",
  );

  if (activeOrTrialing.length === 0) {
    return sorted[0];
  }

  const paidNotCanceling = activeOrTrialing.find(
    (subscription) => !isCancellationScheduled(subscription),
  );
  if (paidNotCanceling) {
    return paidNotCanceling;
  }

  return activeOrTrialing[0];
}

export async function GET(request: Request) {
  const stripe = getStripeClient();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const requestUrl = new URL(request.url);
  const redirectUrl = new URL("/billing", requestUrl.origin);

  if (!stripe || !user) {
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle<{ stripe_customer_id: string | null }>();

    if (!profile?.stripe_customer_id) {
      return NextResponse.redirect(redirectUrl);
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: "all",
      limit: 20,
      expand: ["data.items.data.price"],
    });
    const selected = pickBestSubscription(subscriptions.data);

    if (!selected) {
      return NextResponse.redirect(redirectUrl);
    }

    const priceId = selected.items.data[0]?.price?.id ?? null;
    const planTier = isCancellationScheduled(selected)
      ? "free"
      : getPlanTierFromSubscription(priceId, selected.status);

    const admin = createSupabaseAdminClient();
    await admin
      .from("profiles")
      .update({
        plan_tier: planTier,
        billing_status: selected.status,
        stripe_customer_id:
          typeof selected.customer === "string" ? selected.customer : selected.customer?.id ?? null,
        stripe_subscription_id: selected.id,
        stripe_price_id: priceId,
      })
      .eq("id", user.id);
  } catch (error) {
    console.error("Billing refresh sync failed", {
      userId: user.id,
      message: error instanceof Error ? error.message : "unknown",
    });
  }

  return NextResponse.redirect(redirectUrl);
}

