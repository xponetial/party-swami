import Link from "next/link";
import { CheckCircle2, RefreshCcw, Sparkles, TrendingUp, Zap } from "lucide-react";
import { ShellFrame } from "@/components/layout/shell-frame";
import { Card } from "@/components/ui/card";

const policyItems = [
  {
    icon: TrendingUp,
    title: "Pricing changes",
    body: "Plan pricing, AI allowances, and add-on packs are subject to change at any time. Material changes to a paid plan take effect on the next billing cycle, and active subscribers will be notified before the change is applied.",
  },
  {
    icon: RefreshCcw,
    title: "Subscriptions and auto-renewal",
    body: "Paid subscriptions auto-renew at the end of each billing period at the then-current rate unless you cancel before the renewal date. You can cancel any time from the Billing page. Cancellations take effect at the end of the current period; partial-period refunds are not provided unless required by law.",
  },
  {
    icon: Zap,
    title: "AI usage and add-on packs",
    body: "AI features are subject to monthly usage limits and per-event caps. Hosts can purchase additional AI message and image packs in the app. Heavy or automated usage that exceeds plan limits may be throttled, and additional fees may apply for premium models or top-up packs.",
  },
  {
    icon: Sparkles,
    title: "Beta and experimental features",
    body: "Some platform features are labelled as beta or experimental and are provided as-is. Beta features may change, be paywalled, or be removed without notice and are not covered by service-level guarantees.",
  },
];

const tiers = [
  {
    key: "free",
    name: "Free",
    price: "$0/month",
    badge: "Start here",
    recommended: false,
    features: [
      "Basic templates",
      "50 AI message ideas / month",
      "No AI image generation",
      "Low-res download",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: "$12.99/month",
    badge: "Recommended",
    recommended: true,
    features: [
      "1000 AI message ideas / month",
      "30 AI images / month",
      "Upload + edit images",
      "High-res downloads",
      "No watermark",
      "Save & reuse designs",
      "Additional AI packs available for purchase in app",
    ],
  },
  {
    key: "premium",
    name: "Premium",
    price: "Coming Soon",
    badge: "Future",
    recommended: false,
    features: [
      "3000+ AI message ideas / month",
      "300 AI images / month",
      "Priority generation",
      "Premium templates",
      "Print-ready exports",
    ],
  },
] as const;

export default function PricingPage() {
  return (
    <ShellFrame
      eyebrow="Pricing"
      title="Simple plans, clear value."
      description="Every account starts on Free. Upgrade to Pro from your Billing page when you need more generation power."
      contactContext="pricing"
    >
      <section className="grid gap-4 md:grid-cols-3" aria-label="Plan tiers">
        {tiers.map((tier) => (
          <Card
            key={tier.key}
            className={
              tier.recommended
                ? "border-brand/35 bg-white shadow-party"
                : "bg-white/85"
            }
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">{tier.badge}</p>
              {tier.recommended ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-brand/25 bg-brand/10 px-2 py-1 text-xs font-semibold text-brand">
                  <Sparkles className="size-3.5" />
                  Recommended
                </span>
              ) : null}
            </div>

            <h2 className="mt-3 text-3xl font-semibold text-ink">{tier.name}</h2>
            <p className="mt-1 text-lg font-medium text-brand">{tier.price}</p>

            <div className="mt-5 grid gap-3">
              {tier.features.map((feature) => (
                <div key={feature} className="flex items-start gap-3 rounded-2xl border border-border bg-canvas px-3 py-3 text-sm text-ink">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <div className="mt-6">
              {tier.key === "pro" ? (
                <Link
                  href="/billing"
                  className="inline-flex w-full items-center justify-center rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-brand/40 hover:text-brand"
                >
                  Upgrade from Billing
                </Link>
              ) : tier.key === "free" ? (
                <Link
                  href="/signup"
                  className="inline-flex w-full items-center justify-center rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-brand/40 hover:text-brand"
                >
                  Start on Free
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex w-full items-center justify-center rounded-full border border-border bg-white/70 px-4 py-2 text-sm font-medium text-ink-muted"
                >
                  Coming soon
                </button>
              )}
            </div>
          </Card>
        ))}
      </section>

      <section className="mt-10 space-y-4" aria-label="Pricing policy">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">Pricing policy</p>
          <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            How billing, AI usage, and beta features work
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-ink-muted">
            Plain-language summary of the rules that apply to every Party Swami subscription. The
            full legal versions live in the{" "}
            <Link href="/terms" className="font-medium text-brand underline-offset-4 hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-medium text-brand underline-offset-4 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {policyItems.map((item) => (
            <Card key={item.title} className="bg-white/85">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-accent-soft p-2.5 text-accent">
                  <item.icon className="size-4" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-ink">{item.title}</h3>
                  <p className="text-sm leading-6 text-ink-muted">{item.body}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="bg-[rgba(244,247,255,0.9)]">
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-ink">Refunds and disputes</h3>
            <p className="text-sm leading-6 text-ink-muted">
              Subscription refunds are handled between you and Party Swami under the active plan and
              applicable law. Refunds for vendor services booked through the marketplace are handled
              directly between you and the vendor under the vendor&apos;s own policies. Party Swami
              does not hold funds in escrow for vendor services.
            </p>
          </div>
        </Card>
      </section>
    </ShellFrame>
  );
}
