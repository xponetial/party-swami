import Stripe from "stripe";
import {
  getImagePackBudgetUsd,
  getImagePackPriceId,
  getImagePackSize,
} from "@/lib/billing/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function currentMonthBucket() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

async function getProfileIdByStripeCustomer(customerId: string) {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle<{ id: string }>();

  return data?.id ?? null;
}

async function addImagePackAllowanceForUser({
  userId,
  usageMonth,
  additionalImages,
  additionalBudgetUsd,
}: {
  userId: string;
  usageMonth: string;
  additionalImages: number;
  additionalBudgetUsd: number;
}) {
  const supabase = createSupabaseAdminClient();
  const { data: existing } = await supabase
    .from("user_image_monthly_allowances")
    .select("user_id, usage_month, additional_images, additional_budget_usd")
    .eq("user_id", userId)
    .eq("usage_month", usageMonth)
    .maybeSingle<{
      user_id: string;
      usage_month: string;
      additional_images: number;
      additional_budget_usd: number;
    }>();

  if (existing) {
    const { error } = await supabase
      .from("user_image_monthly_allowances")
      .update({
        additional_images: existing.additional_images + additionalImages,
        additional_budget_usd: Number(
          (Number(existing.additional_budget_usd ?? 0) + additionalBudgetUsd).toFixed(2),
        ),
      })
      .eq("user_id", userId)
      .eq("usage_month", usageMonth);

    if (error) {
      throw new Error(`Failed to update image pack allowance: ${error.message}`);
    }
    return;
  }

  const { error } = await supabase.from("user_image_monthly_allowances").insert({
    user_id: userId,
    usage_month: usageMonth,
    additional_images: additionalImages,
    additional_budget_usd: Number(additionalBudgetUsd.toFixed(2)),
  });

  if (error) {
    throw new Error(`Failed to create image pack allowance: ${error.message}`);
  }
}

export async function grantImagePackAllowanceFromCheckoutSession({
  stripe,
  session,
}: {
  stripe: Stripe;
  session: Stripe.Checkout.Session;
}) {
  const imagePackPriceId = getImagePackPriceId();

  if (!imagePackPriceId) {
    return { granted: false, reason: "image_pack_price_missing" as const };
  }

  if (session.mode !== "payment" && session.metadata?.checkout_kind !== "image_pack") {
    return { granted: false, reason: "not_image_pack_checkout" as const };
  }

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 20,
    expand: ["data.price"],
  });
  const packQuantity = lineItems.data.reduce((sum, lineItem) => {
    const linePriceId =
      typeof lineItem.price === "string" ? lineItem.price : lineItem.price?.id ?? null;
    if (linePriceId !== imagePackPriceId) return sum;
    return sum + Math.max(1, lineItem.quantity ?? 1);
  }, 0);

  if (packQuantity <= 0) {
    return { granted: false, reason: "pack_line_item_missing" as const };
  }

  let userId = session.metadata?.supabase_user_id ?? null;
  if (!userId) {
    const customerId =
      typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
    if (customerId) {
      userId = await getProfileIdByStripeCustomer(customerId);
    }
  }

  if (!userId) {
    return { granted: false, reason: "user_not_found" as const };
  }

  const usageMonth = session.metadata?.usage_month ?? currentMonthBucket();
  const additionalImages = packQuantity * getImagePackSize();
  const additionalBudgetUsd = Number((packQuantity * getImagePackBudgetUsd()).toFixed(2));
  const supabase = createSupabaseAdminClient();

  const { error: grantError } = await supabase.from("user_image_pack_grants").insert({
    user_id: userId,
    usage_month: usageMonth,
    stripe_checkout_session_id: session.id,
    pack_quantity: packQuantity,
    additional_images: additionalImages,
    additional_budget_usd: additionalBudgetUsd,
  });

  if (grantError?.code === "23505") {
    return { granted: false, reason: "already_granted" as const };
  }

  if (grantError) {
    throw new Error(`Failed to create image pack grant record: ${grantError.message}`);
  }

  await addImagePackAllowanceForUser({
    userId,
    usageMonth,
    additionalImages,
    additionalBudgetUsd,
  });

  return { granted: true as const };
}
