import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPlanTierFromSubscription, getStripeClient } from "@/lib/billing/stripe";

function isCancellationScheduled(subscription: {
  cancel_at_period_end: boolean;
  cancel_at: number | null;
}) {
  const hasFutureCancel =
    typeof subscription.cancel_at === "number" && subscription.cancel_at * 1000 > Date.now();
  return subscription.cancel_at_period_end || hasFutureCancel;
}

export async function GET(request: Request) {
  const stripe = getStripeClient();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const requestUrl = new URL(request.url);
  const redirectUrl = new URL("/billing?billing=success", requestUrl.origin);
  const sessionId = requestUrl.searchParams.get("session_id");

  if (!stripe || !user || !sessionId) {
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    const metadataUserId = session.metadata?.supabase_user_id ?? null;
    if (metadataUserId && metadataUserId !== user.id) {
      return NextResponse.redirect(redirectUrl);
    }

    const subscriptionId =
      typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;

    if (!subscriptionId) {
      return NextResponse.redirect(redirectUrl);
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["items.data.price"],
    });
    const customerId =
      typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id ?? null;
    const priceId = subscription.items.data[0]?.price?.id ?? null;
    const planTier = isCancellationScheduled(subscription)
      ? "free"
      : getPlanTierFromSubscription(priceId, subscription.status);

    await supabase
      .from("profiles")
      .update({
        plan_tier: planTier,
        billing_status: subscription.status,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId,
      })
      .eq("id", user.id);
  } catch (error) {
    console.error("Billing success sync failed", {
      userId: user.id,
      sessionId,
      message: error instanceof Error ? error.message : "unknown",
    });
  }

  return NextResponse.redirect(redirectUrl);
}

