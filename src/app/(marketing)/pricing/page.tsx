import Link from "next/link";
import { CheckCircle2, Sparkles } from "lucide-react";
import { ShellFrame } from "@/components/layout/shell-frame";
import { Card } from "@/components/ui/card";

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
      "100 AI images / month",
      "Upload + edit images",
      "High-res downloads",
      "No watermark",
      "Save & reuse designs",
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
      "500 AI images / month",
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
      <section className="grid gap-4 md:grid-cols-3">
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
    </ShellFrame>
  );
}
