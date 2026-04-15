import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ManageBillingButton } from "@/components/billing/manage-billing-button";
import { ProUpgradeButton } from "@/components/billing/pro-upgrade-button";
import { BuyImagePackButton } from "@/components/billing/buy-image-pack-button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAiUsageForUser, getInviteImageUsageForUser } from "@/lib/ai/usage";

type BillingProfile = {
  plan_tier: "free" | "pro" | "admin" | null;
  billing_status: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
};

type ImagePackGrant = {
  id: string;
  pack_quantity: number;
  additional_images: number;
  additional_budget_usd: number;
  created_at: string;
};

const PAYMENT_ISSUE_STATUSES = new Set([
  "past_due",
  "unpaid",
  "incomplete",
  "incomplete_expired",
]);

function formatBillingStatus(value: string | null) {
  if (!value) {
    return "Not started";
  }

  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function planLabelFromTier(tier: "free" | "pro" | "admin") {
  if (tier === "admin") {
    return "Concierge Admin";
  }

  if (tier === "pro") {
    return "Pro Host";
  }

  return "Starter Host";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const billingState = resolvedSearchParams.billing ?? null;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AppShell
        currentSection="/billing"
        title="Billing"
        description="Sign in to view your current plan, billing status, and subscription controls."
        actions={
          <Button asChild>
            <Link href="/login?next=/billing">Login</Link>
          </Button>
        }
      >
        <DashboardPanel
          title="Sign in to manage billing"
          description="Billing tools are tied to your authenticated host account."
        >
          <div className="rounded-3xl border border-border bg-white/75 p-5">
            <p className="text-sm leading-6 text-ink-muted">
              Once signed in, this page will show your plan tier, Stripe subscription status, and direct controls to
              upgrade or manage billing.
            </p>
          </div>
        </DashboardPanel>
      </AppShell>
    );
  }

  const [{ data: profile }, usage, { data: packGrants = [] }] = await Promise.all([
    supabase
      .from("profiles")
      .select("plan_tier, billing_status, stripe_customer_id, stripe_subscription_id, stripe_price_id")
      .eq("id", user.id)
      .maybeSingle<BillingProfile>(),
    getAiUsageForUser(supabase, user.id),
    supabase
      .from("user_image_pack_grants")
      .select("id, pack_quantity, additional_images, additional_budget_usd, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(6)
      .returns<ImagePackGrant[]>(),
  ]);

  const safePackGrants = packGrants ?? [];
  const planTier = profile?.plan_tier ?? usage.planTier ?? "free";
  const rawBillingStatus = profile?.billing_status ?? null;
  const billingStatus = formatBillingStatus(profile?.billing_status ?? null);
  const planLabel = planLabelFromTier(planTier);
  const showPaymentIssueMessage =
    planTier === "free" && rawBillingStatus !== null && PAYMENT_ISSUE_STATUSES.has(rawBillingStatus);
  const hasImageAccess = planTier === "pro" || planTier === "admin";
  const inviteImageUsage = hasImageAccess
    ? await getInviteImageUsageForUser(supabase, user.id, planTier === "admin" ? "admin" : "pro")
    : null;
  const canManageBilling =
    Boolean(profile?.stripe_customer_id) &&
    (planTier === "pro" || planTier === "admin" || showPaymentIssueMessage);
  const showStripeSyncDetails = process.env.VERCEL_ENV !== "production";

  return (
    <AppShell
      currentSection="/billing"
      title="Billing"
      description="Manage your Party Swami plan and Stripe subscription in one place."
      actions={
        <Button asChild variant="secondary">
          <Link href="/pricing">Compare plans</Link>
        </Button>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          {billingState === "image_pack_success" ? (
            <div className="mb-4 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Image pack purchase successful. Your monthly image cap and budget were updated.
            </div>
          ) : null}
          {billingState === "image_pack_cancelled" ? (
            <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Image pack checkout was canceled. No changes were made.
            </div>
          ) : null}
          <h2 className="text-xl font-semibold text-ink">Current plan</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-white/80 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Plan</p>
              <p className="mt-2 text-base font-semibold text-ink">{planLabel}</p>
            </div>
            <div className="rounded-2xl border border-border bg-white/80 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Billing status</p>
              <p className="mt-2 text-base font-semibold text-ink">{billingStatus}</p>
            </div>
            <div className="rounded-2xl border border-border bg-white/80 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">AI requests left</p>
              <p className="mt-2 text-base font-semibold text-ink">{usage.remaining.requests}</p>
            </div>
          </div>
          {inviteImageUsage ? (
            <div className="mt-3 rounded-2xl border border-border bg-white/80 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">AI images this month</p>
              <p className="mt-2 text-sm text-ink">
                <span className="font-semibold">{inviteImageUsage.generatedImagesCount}</span> used |
                <span className="font-semibold"> {inviteImageUsage.imagesLeftThisMonth}</span> left from cap
                <span className="font-semibold"> {inviteImageUsage.monthlyImageCap}</span>
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                Budget used: ${inviteImageUsage.usedBudgetUsd.toFixed(2)} / ${inviteImageUsage.monthlyBudgetUsd.toFixed(2)}
                {inviteImageUsage.purchasedImagePackCount > 0
                  ? ` | ${inviteImageUsage.purchasedImagePackCount} image pack${inviteImageUsage.purchasedImagePackCount === 1 ? "" : "s"} purchased`
                  : ""}
              </p>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            {canManageBilling ? <ManageBillingButton /> : <ProUpgradeButton />}
            {hasImageAccess ? <BuyImagePackButton /> : null}
            <Button asChild variant="secondary">
              <Link href="/pricing">View plans</Link>
            </Button>
          </div>

          {showPaymentIssueMessage ? (
            <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Your card payment did not go through, so your membership was downgraded to Free. Update your card in
              <span className="font-semibold"> Manage billing </span>
              to restore Pro access.
            </div>
          ) : null}
        </Card>

        <Card className="bg-[rgba(244,247,255,0.9)]">
          <h2 className="text-xl font-semibold text-ink">Image pack history</h2>
          {safePackGrants.length ? (
            <div className="mt-4 space-y-3">
              {safePackGrants.map((grant) => (
                <div
                  key={grant.id}
                  className="rounded-2xl border border-border bg-white/85 px-4 py-4"
                >
                  <p className="text-sm font-semibold text-ink">
                    +{grant.additional_images} images | +${Number(grant.additional_budget_usd).toFixed(2)} budget
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {grant.pack_quantity} pack{grant.pack_quantity === 1 ? "" : "s"} | {formatDate(grant.created_at)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-border bg-white/85 px-4 py-4 text-sm text-ink-muted">
              No image packs purchased yet.
            </div>
          )}
        </Card>

        {showStripeSyncDetails ? (
          <Card className="bg-[rgba(244,247,255,0.9)]">
            <h2 className="text-xl font-semibold text-ink">Stripe sync details</h2>
            <div className="mt-5 grid gap-3">
              {[
                ["Stripe customer", profile?.stripe_customer_id ?? "Not linked yet"],
                ["Subscription", profile?.stripe_subscription_id ?? "Not linked yet"],
                ["Price ID", profile?.stripe_price_id ?? "Not linked yet"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-2xl border border-border bg-white/85 px-4 py-4">
                  <p className="text-sm text-ink-muted">{label}</p>
                  <p className="text-sm font-medium text-ink">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-3xl border border-border bg-white/85 p-4 text-sm leading-6 text-ink-muted">
              If your Stripe checkout succeeded but this page still shows Starter, wait a few seconds and refresh. The
              webhook updates your profile as soon as Stripe confirms the event.
            </div>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
