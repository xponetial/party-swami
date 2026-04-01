import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { ShellFrame } from "@/components/layout/shell-frame";
import { Card } from "@/components/ui/card";
import { DEFAULT_LIMITS, type PlanTier } from "@/lib/ai/limits";

const tiers: Array<{
  tier: PlanTier;
  name: string;
  price: string;
  eyebrow: string;
  description: string;
  highlights: string[];
  ctaHref: string;
  ctaLabel: string;
}> = [
  {
    tier: "free",
    name: "Free Beta",
    price: "$0",
    eyebrow: "Start here",
    description: "Best for hosts validating one event flow end to end while the product is still in active beta.",
    highlights: [
      "Protected event workspace, invite builder, public RSVP, and email sending",
      "AI planning with enough room to generate, revise, and test a real event",
      "Great fit for personal parties and founder-led onboarding",
    ],
    ctaHref: "/signup",
    ctaLabel: "Start free",
  },
  {
    tier: "pro",
    name: "Pro Host",
    price: "$19/mo",
    eyebrow: "Most popular",
    description: "For repeat hosts and small teams who want far more AI headroom without losing the same simple workflow.",
    highlights: [
      "10x more monthly AI requests than the free tier",
      "Higher per-event planning allowance for multiple revision loops",
      "Ideal for hosts managing several active events at once",
    ],
    ctaHref: "/signup",
    ctaLabel: "Join the waitlist",
  },
  {
    tier: "admin",
    name: "Concierge Admin",
    price: "Custom",
    eyebrow: "Premium",
    description: "Reserved for internal operators, premium concierge workflows, and future white-glove execution support.",
    highlights: [
      "Highest AI capacity for premium service or internal support operations",
      "Built to support advanced routing and concierge-grade generation tasks",
      "Best for managed experiences rather than self-serve event hosting",
    ],
    ctaHref: "/login",
    ctaLabel: "Talk to us",
  },
];

export default function PricingPage() {
  return (
    <ShellFrame
      eyebrow="Pricing"
      title="Real plan tiers for the PartyGenie beta."
      description="These tiers now mirror the AI request, budget, and per-event planning limits enforced inside the product so hosts know exactly what kind of runway they have."
    >
      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="bg-gradient-to-br from-white via-[#fff8ee] to-[#f6fbff]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-ink">
              <Sparkles className="size-3.5 text-brand" />
              Live tiering
            </span>
            <p className="text-sm text-ink-muted">The limits below come directly from the app&apos;s AI usage guardrails.</p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {tiers.map((item) => {
              const limits = DEFAULT_LIMITS[item.tier];

              return (
                <div
                  key={item.tier}
                  data-testid={`pricing-card-${item.tier}`}
                  className={`rounded-[2rem] border p-5 ${
                    item.tier === "pro"
                      ? "border-brand/30 bg-white shadow-party"
                      : "border-border bg-white/80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">{item.eyebrow}</p>
                      <h2 className="mt-2 text-2xl font-semibold text-ink">{item.name}</h2>
                    </div>
                    <p className="text-sm font-semibold text-brand">{item.price}</p>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-ink-muted">{item.description}</p>
                  <div className="mt-5 grid gap-3 rounded-[1.5rem] border border-border bg-canvas px-4 py-4 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-ink-muted">Monthly AI requests</span>
                      <span className="font-semibold text-ink">{limits.monthlyRequests}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-ink-muted">Monthly AI budget</span>
                      <span className="font-semibold text-ink">${limits.monthlyCostUsd}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-ink-muted">Plan revisions per event</span>
                      <span className="font-semibold text-ink">{limits.planRequestsPerEvent}</span>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3">
                    {item.highlights.map((highlight) => (
                      <div key={highlight} className="flex items-start gap-3 text-sm leading-6 text-ink-muted">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand" />
                        <span>{highlight}</span>
                      </div>
                    ))}
                  </div>
                  <Link
                    href={item.ctaHref}
                    className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-brand/40 hover:text-brand"
                  >
                    {item.ctaLabel}
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="bg-[#fffaf2]">
          <h2 className="text-xl font-semibold text-ink">What changes between tiers</h2>
          <div className="mt-5 grid gap-3">
            {[
              "Free Beta keeps the whole host workflow open while deliberately capping AI spend during onboarding and early testing.",
              "Pro Host is the natural upgrade once a host is planning frequently enough to hit the event-level revision ceiling.",
              "Concierge Admin is reserved for premium service, internal operators, and future hands-on planning workflows powered by the highest-capacity model lane.",
            ].map((item) => (
              <div key={item} className="rounded-3xl border border-border bg-white/85 p-4 text-sm leading-6 text-ink-muted">
                {item}
              </div>
            ))}
          </div>
        </Card>
      </section>
    </ShellFrame>
  );
}
