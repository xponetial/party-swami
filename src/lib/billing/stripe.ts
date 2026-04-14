import Stripe from "stripe";
import type { PlanTier } from "@/lib/ai/limits";

const ACTIVE_STRIPE_STATUSES = new Set<Stripe.Subscription.Status>(["active", "trialing"]);

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    return null;
  }

  return new Stripe(secretKey, {
    apiVersion: "2026-03-25.dahlia",
  });
}

export function getProMonthlyPriceId() {
  return process.env.STRIPE_PRICE_ID_PRO_MONTHLY?.trim() ?? null;
}

export function getImagePackPriceId() {
  return process.env.STRIPE_PRICE_ID_IMAGE_PACK?.trim() ?? null;
}

export function getImagePackSize() {
  const value = Number(process.env.INVITE_IMAGE_PACK_SIZE);
  if (Number.isFinite(value) && value > 0) return Math.floor(value);
  return 30;
}

export function getImagePackBudgetUsd() {
  const value = Number(process.env.INVITE_IMAGE_PACK_BUDGET_USD);
  if (Number.isFinite(value) && value > 0) return Number(value.toFixed(2));
  return 10;
}

export function getStripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? null;
}

export function isPremiumStripePrice(priceId: string | null | undefined) {
  const proMonthly = getProMonthlyPriceId();

  if (!proMonthly) {
    return false;
  }

  return priceId === proMonthly;
}

export function getPlanTierFromStripePrice(priceId: string | null | undefined): PlanTier {
  return isPremiumStripePrice(priceId) ? "pro" : "free";
}

export function getPlanTierFromSubscription(
  priceId: string | null | undefined,
  status: Stripe.Subscription.Status,
): PlanTier {
  if (!ACTIVE_STRIPE_STATUSES.has(status)) {
    return "free";
  }

  // Temporary fallback while Phase 2 only supports one paid host tier.
  // If Stripe price IDs rotate but subscription remains active/trialing, keep paid users on Pro.
  if (priceId && !isPremiumStripePrice(priceId)) {
    return "pro";
  }

  return getPlanTierFromStripePrice(priceId);
}
