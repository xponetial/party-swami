import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ManageBillingButton } from "@/components/billing/manage-billing-button";
import { ProUpgradeButton } from "@/components/billing/pro-upgrade-button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAiUsageForUser } from "@/lib/ai/usage";

type BillingProfile = {
  plan_tier: "free" | "pro" | "admin" | null;
  billing_status: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
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

export default async function BillingPage() {
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

  const [{ data: profile }, usage] = await Promise.all([
    supabase
      .from("profiles")
      .select("plan_tier, billing_status, stripe_customer_id, stripe_subscription_id, stripe_price_id")
      .eq("id", user.id)
      .maybeSingle<BillingProfile>(),
    getAiUsageForUser(supabase, user.id),
  ]);

  const planTier = profile?.plan_tier ?? usage.planTier ?? "free";
  const rawBillingStatus = profile?.billing_status ?? null;
  const billingStatus = formatBillingStatus(profile?.billing_status ?? null);
  const planLabel = planLabelFromTier(planTier);
  const canManageBilling = Boolean(profile?.stripe_customer_id);
  const showPaymentIssueMessage =
    planTier === "free" && rawBillingStatus !== null && PAYMENT_ISSUE_STATUSES.has(rawBillingStatus);
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

          <div className="mt-5 flex flex-wrap gap-2">
            {canManageBilling ? <ManageBillingButton /> : <ProUpgradeButton />}
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
