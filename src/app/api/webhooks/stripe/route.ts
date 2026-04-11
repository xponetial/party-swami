import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getPlanTierFromStripePrice,
  getPlanTierFromSubscription,
  getStripeClient,
  getStripeWebhookSecret,
} from "@/lib/billing/stripe";

type BillingPatch = {
  plan_tier: "free" | "pro" | "admin";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  billing_status: string | null;
};

function isMissingSchemaError(error: { code?: string; message?: string } | null | undefined) {
  return Boolean(error && (error.code === "42P01" || error.code === "42703"));
}

async function resolveProfileIdForBilling({
  customerId,
  subscriptionId,
}: {
  customerId?: string | null;
  subscriptionId?: string | null;
}) {
  const supabase = createSupabaseAdminClient();

  if (subscriptionId) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("stripe_subscription_id", subscriptionId)
      .maybeSingle<{ id: string }>();

    if (data?.id) {
      return data.id;
    }
  }

  if (customerId) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle<{ id: string }>();

    if (data?.id) {
      return data.id;
    }
  }

  return null;
}

async function updateProfileBillingByUserId(userId: string, patch: BillingPatch) {
  const supabase = createSupabaseAdminClient();
  const fullWrite = await supabase.from("profiles").upsert(
    {
      id: userId,
      plan_tier: patch.plan_tier,
      stripe_customer_id: patch.stripe_customer_id,
      stripe_subscription_id: patch.stripe_subscription_id,
      stripe_price_id: patch.stripe_price_id,
      billing_status: patch.billing_status,
    },
    { onConflict: "id" },
  );

  if (!fullWrite.error) {
    return;
  }

  if (!isMissingSchemaError(fullWrite.error)) {
    throw new Error(`Failed to sync billing profile: ${fullWrite.error.message}`);
  }

  // Fallback for environments that have not received the full Stripe billing migration yet.
  const minimalWrite = await supabase.from("profiles").upsert(
    {
      id: userId,
      plan_tier: patch.plan_tier,
    },
    { onConflict: "id" },
  );

  if (minimalWrite.error) {
    throw new Error(`Failed to sync fallback plan tier: ${minimalWrite.error.message}`);
  }
}

async function updateProfileBillingByStripeIds({
  customerId,
  subscriptionId,
  patch,
}: {
  customerId?: string | null;
  subscriptionId?: string | null;
  patch: BillingPatch;
}) {
  const profileId = await resolveProfileIdForBilling({
    customerId: customerId ?? null,
    subscriptionId: subscriptionId ?? null,
  });

  if (!profileId) {
    return;
  }

  await updateProfileBillingByUserId(profileId, patch);
}

async function markEventProcessed(event: Stripe.Event) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("stripe_webhook_events").insert({
    stripe_event_id: event.id,
    stripe_event_type: event.type,
  });

  if (isMissingSchemaError(error)) {
    // Environments missing stripe_webhook_events cannot dedupe yet; keep processing.
    return { duplicate: false as const };
  }

  if (error?.code === "23505") {
    return { duplicate: true as const };
  }

  if (error) {
    throw new Error(`Failed to persist webhook event ${event.id}: ${error.message}`);
  }

  return { duplicate: false as const };
}

async function syncFromSubscription(subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id ?? null;

  await updateProfileBillingByStripeIds({
    customerId,
    subscriptionId: subscription.id,
    patch: {
      plan_tier: getPlanTierFromSubscription(priceId, subscription.status),
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      billing_status: subscription.status,
    },
  });
}

async function handleCheckoutSessionCompleted(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
) {
  const userId = session.metadata?.supabase_user_id ?? null;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
  const customerId = typeof session.customer === "string" ? session.customer : null;

  if (!subscriptionId) {
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });
  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const resolvedCustomerId =
    typeof subscription.customer === "string" ? subscription.customer : customerId;
  const patch: BillingPatch = {
    plan_tier: getPlanTierFromStripePrice(priceId),
    stripe_customer_id: resolvedCustomerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    billing_status: subscription.status,
  };

  if (userId) {
    await updateProfileBillingByUserId(userId, patch);
    return;
  }

  await updateProfileBillingByStripeIds({
    customerId: resolvedCustomerId,
    subscriptionId: subscription.id,
    patch,
  });
}

async function handleInvoiceEvent(stripe: Stripe, invoice: Stripe.Invoice) {
  const parentSubscription = invoice.parent?.subscription_details?.subscription;
  const subscriptionId =
    typeof parentSubscription === "string"
      ? parentSubscription
      : parentSubscription?.id ?? null;

  if (!subscriptionId) {
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });
  await syncFromSubscription(subscription);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id ?? null;

  await updateProfileBillingByStripeIds({
    customerId,
    subscriptionId: subscription.id,
    patch: {
      plan_tier: "free",
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: null,
      billing_status: subscription.status,
    },
  });
}

export async function POST(request: NextRequest) {
  const stripe = getStripeClient();
  const webhookSecret = getStripeWebhookSecret();

  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { ok: false, message: "Stripe webhook handling is not configured." },
      { status: 503 },
    );
  }

  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ ok: false, message: "Missing Stripe signature." }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ ok: false, message: "Invalid Stripe signature." }, { status: 400 });
  }

  try {
    const dedupe = await markEventProcessed(event);

    if (dedupe.duplicate) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(stripe, event.data.object as Stripe.Checkout.Session);
        break;
      case "invoice.paid":
      case "invoice.payment_failed":
        await handleInvoiceEvent(stripe, event.data.object as Stripe.Invoice);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Stripe webhook processing failed", {
      eventId: event.id,
      eventType: event.type,
      message: error instanceof Error ? error.message : "unknown",
    });

    return NextResponse.json({ ok: false, message: "Webhook processing failed." }, { status: 500 });
  }
}
