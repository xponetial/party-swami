import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  CalendarCheck2,
  Handshake,
  Megaphone,
  Sparkles,
  Store,
  UsersRound,
} from "lucide-react";
import { ShellFrame } from "@/components/layout/shell-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const programHighlights = [
  {
    icon: BadgeDollarSign,
    label: "Free to join",
    text: "Create your Party Swami provider profile at no cost while Phase 3 marketplace demand is growing.",
  },
  {
    icon: Handshake,
    label: "First 2 leads free",
    text: "Vendors get their first two host introductions free of charge before any future lead-fee model begins.",
  },
  {
    icon: Megaphone,
    label: "Local discovery",
    text: "Profiles can be matched by ZIP, city, service radius, category, and the host's party context.",
  },
];

const providerPaths = [
  {
    id: "vendor",
    icon: Store,
    eyebrow: "Vendors",
    title: "Get found when hosts need the missing party piece",
    description:
      "Best for bakeries, DJs, caterers, balloon artists, decorators, entertainers, venues, rentals, and specialty services.",
    benefits: ["Public storefront", "ZIP-radius matching", "Package or custom quote leads"],
    cost: "Free signup. First 2 leads free for vendors.",
    href: "/signup?next=%2Fvendors%2Fsignup",
    cta: "Sign up as a vendor",
  },
  {
    id: "planner",
    icon: CalendarCheck2,
    eyebrow: "Party planners",
    title: "Turn host overwhelm into paid planning support",
    description:
      "Best for planners who offer quick consults, hourly help, day-of coordination, or full-service party planning.",
    benefits: ["Consult and full-service profiles", "Lead tracking dashboard", "Review and response tools"],
    cost: "Free signup during Phase 3.",
    href: "/signup?next=%2Fplanners%2Fsignup",
    cta: "Sign up as a planner",
  },
];

export default function PartnerSignupPage() {
  return (
    <ShellFrame
      eyebrow="Vendor and planner signup"
      title="Join the Party Swami marketplace"
      description="Get in front of hosts who are already planning real events. Signup is free, profiles are reviewed before going live, and vendors get their first two leads free of charge."
      contactContext="marketing"
    >
      <div className="grid gap-6">
        <section className="grid gap-5 lg:grid-cols-[1fr_0.9fr] lg:items-stretch">
          <div className="rounded-[2rem] border border-white/80 bg-[linear-gradient(135deg,rgba(255,247,251,0.94)_0%,rgba(239,246,255,0.96)_52%,rgba(255,249,224,0.86)_100%)] p-6 shadow-party">
            <Badge>Phase 3 partner program</Badge>
            <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              Meet hosts right when they are choosing cakes, decor, venues, and planning help.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-ink-muted">
              Party Swami turns a host&apos;s event details into planning steps, shopping suggestions,
              and provider recommendations. Your profile gives that host a clear next step when
              they want expert help instead of another tab to manage.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                className="bg-[linear-gradient(135deg,#ff4fc3_0%,#8b4dff_42%,#168bff_100%)] px-7 py-4 text-base shadow-[0_20px_40px_rgba(120,75,255,0.22)]"
                size="lg"
              >
                <Link href="/signup?next=%2Fvendors%2Fsignup">
                  Vendor signup
                  <ArrowRight className="size-5" />
                </Link>
              </Button>
              <Button
                asChild
                className="border-0 bg-[linear-gradient(135deg,#16c7ff_0%,#31d68b_48%,#ffd75f_100%)] px-7 py-4 text-base text-ink shadow-[0_20px_40px_rgba(38,178,180,0.18)] hover:brightness-105"
                size="lg"
                variant="secondary"
              >
                <Link href="/signup?next=%2Fplanners%2Fsignup">
                  Planner signup
                  <Sparkles className="size-5" />
                </Link>
              </Button>
            </div>
          </div>

          <Card className="flex flex-col justify-between gap-4">
            <div>
              <Badge>Costs</Badge>
              <h2 className="mt-4 text-2xl font-semibold text-ink">Simple Phase 3 terms</h2>
            </div>
            <div className="grid gap-3">
              {programHighlights.map((item) => (
                <div key={item.label} className="flex gap-3 rounded-3xl border border-border bg-white/60 p-4">
                  <item.icon className="mt-0.5 size-5 shrink-0 text-brand" />
                  <div>
                    <p className="font-semibold text-ink">{item.label}</p>
                    <p className="mt-1 text-sm leading-6 text-ink-muted">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="rounded-3xl border border-border bg-canvas/70 p-4 text-sm leading-6 text-ink-muted">
              Questions before applying? Email{" "}
              <a className="font-semibold text-brand" href="mailto:marketplace.admin@partyswami.com">
                marketplace.admin@partyswami.com
              </a>
              .
            </p>
          </Card>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          {providerPaths.map((path) => (
            <Card key={path.id} id={path.id} className="scroll-mt-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge>{path.eyebrow}</Badge>
                  <h2 className="mt-4 text-2xl font-semibold text-ink">{path.title}</h2>
                </div>
                <div className="rounded-2xl bg-accent-soft p-3 text-accent">
                  <path.icon className="size-6" />
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-ink-muted">{path.description}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {path.benefits.map((benefit) => (
                  <div key={benefit} className="rounded-2xl border border-border bg-white/60 px-4 py-3">
                    <UsersRound className="size-4 text-brand" />
                    <p className="mt-2 text-sm font-semibold text-ink">{benefit}</p>
                  </div>
                ))}
              </div>
              <p className="mt-5 rounded-2xl bg-canvas px-4 py-3 text-sm font-semibold text-ink">
                {path.cost}
              </p>
              <Button
                asChild
                className="mt-5 w-full px-7 py-4 text-base shadow-[0_18px_34px_rgba(101,85,176,0.2)]"
                size="lg"
              >
                <Link href={path.href}>
                  {path.cta}
                  <ArrowRight className="size-5" />
                </Link>
              </Button>
            </Card>
          ))}
        </section>
      </div>
    </ShellFrame>
  );
}
