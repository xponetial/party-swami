import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  ConciergeBell,
  ListChecks,
  MapPin,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import { ShellFrame } from "@/components/layout/shell-frame";
import { AuthSessionRedirect } from "@/components/auth/auth-session-redirect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const heroBullets = [
  {
    text: "Create invitations and plan your event with AI",
    icon: BrainCircuit,
  },
  {
    text: "Shop curated party supplies instantly",
    icon: ShoppingBag,
  },
  {
    text: "Connect with local vendors and venues",
    icon: MapPin,
  },
  {
    text: "Get help from professional party planners",
    icon: ConciergeBell,
  },
];

const journeySteps = [
  {
    title: "Step 1: Create Your Event",
    description:
      "Tell Party Swami what you're planning. Our AI generates your invite, theme, and plan instantly.",
    icon: Sparkles,
  },
  {
    title: "Step 2: Get Smart Recommendations",
    description:
      "Automatically receive shopping lists, decorations, food ideas, and activities tailored to your event.",
    icon: ShoppingBag,
  },
  {
    title: "Step 3: Book Vendors or Get Help",
    description:
      "Browse local vendors, venues, DJs, and bakers or hire a professional planner to handle everything.",
    icon: Search,
  },
  {
    title: "Step 4: Execute with Confidence",
    description: "Track tasks, manage guests, and stay on budget all in one place.",
    icon: BadgeCheck,
  },
];

const platformFeatures = [
  {
    badge: "AI Event Planning",
    headline: "Your Personal AI Party Planner",
    copy: "Party Swami uses AI to generate everything you need, from invitations and themes to timelines and checklists. No more guesswork.",
    bullets: [
      "AI-generated invitations and wording",
      "Smart guest management and RSVP tracking",
      "Automated timelines and reminders",
      "Budget tracking and planning tools",
    ],
    icon: BrainCircuit,
  },
  {
    badge: "Smart Shopping Experience",
    headline: "Everything You Need, Already Picked for You",
    copy: "Based on your event, Party Swami builds a complete shopping list across decorations, food, drinks, and more.",
    bullets: [
      "Curated product recommendations",
      "One-click shopping experience",
      "Organized by category",
      "Designed for your specific party type",
    ],
    icon: ShoppingBag,
  },
  {
    badge: "Vendor Marketplace",
    headline: "Find and Book Trusted Vendors",
    copy: "Search and connect with local vendors including venues, DJs, bakers, and entertainers.",
    bullets: [
      "Search by location and category",
      "Compare vendors and packages",
      "Send requests and receive quotes",
      "Read verified reviews",
    ],
    icon: Store,
  },
  {
    badge: "Professional Party Planners",
    headline: "Need Help? Bring in a Pro",
    copy: "Work directly with experienced party planners who can guide you or fully manage your event.",
    bullets: [
      "Basic guidance or full-service planning",
      "Personalized recommendations",
      "Direct communication inside the platform",
      "Flexible service levels",
    ],
    icon: Users,
  },
];

export default function MarketingHomePage() {
  return (
    <>
      <AuthSessionRedirect to="/dashboard" />
      <ShellFrame
        eyebrow="AI-powered planning and marketplace"
        title="Plan the Perfect Party. Book Everything in One Place."
        description="Party Swami connects AI planning, curated shopping, trusted vendors, and professional planners in one end-to-end platform."
        brandVisual={
          <Link
            href="/"
            className="block overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#080c24] shadow-[0_24px_70px_rgba(7,11,34,0.32)]"
          >
            <Image
              src="/party-swami-banner.png"
              alt="Party Swami celebration banner"
              width={1120}
              height={768}
              priority
              className="block h-auto w-full object-cover"
            />
          </Link>
        }
      >
        <div className="space-y-8">
          <section data-tour-id="marketing-hero" className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="space-y-5 border-white/70 bg-[linear-gradient(135deg,rgba(245,223,255,0.34)_0%,rgba(237,243,255,0.94)_56%,rgba(228,239,255,0.98)_100%)] p-6 shadow-party sm:p-8">
              <Badge>AI + Marketplace + Vendors + Planners</Badge>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
                  Plan the Perfect Party. Book Everything in One Place.
                </h1>
                <p className="max-w-3xl text-base leading-7 text-ink-muted sm:text-lg sm:leading-8">
                  AI-powered party planning meets a full marketplace of vendors, supplies, and professional planners. From idea to execution, Party Swami does it all.
                </p>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  Plan It. Shop It. Book It. Done.
                </p>
              </div>
              <div data-tour-id="marketing-actions" className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/create-event">
                    Start Planning Your Party
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link href="/marketplace">
                    Explore Vendors
                    <ShoppingBag className="size-4" />
                  </Link>
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {heroBullets.map((item) => (
                  <div key={item.text} className="flex gap-3 rounded-2xl border border-white/60 bg-white/55 p-4">
                    <item.icon className="mt-0.5 size-4 shrink-0 text-brand" />
                    <p className="text-sm leading-6 text-ink">{item.text}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="h-full border-white/60 bg-[rgba(244,247,255,0.86)] p-6 shadow-party sm:p-8">
              <Badge>From Idea to Celebration in Minutes</Badge>
              <div className="mt-5 grid gap-4">
                {journeySteps.map((step) => (
                  <div key={step.title} className="rounded-3xl border border-border bg-white/85 p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-accent-soft p-2.5 text-accent">
                        <step.icon className="size-4" />
                      </div>
                      <h2 className="text-base font-semibold text-ink">{step.title}</h2>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-ink-muted">{step.description}</p>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          <section className="space-y-5">
            <div className="space-y-2">
              <Badge>Core platform</Badge>
              <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                AI planning, shopping, vendors, and planners in one workflow
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-ink-muted sm:text-base">
                Party Swami removes the handoff gaps between planning, purchasing, and booking so hosts can execute faster with fewer tools.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {platformFeatures.map((feature) => (
                <Card key={feature.headline} className="h-full border-white/70 bg-[rgba(255,255,255,0.72)] p-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-accent-soft p-3 text-accent">
                      <feature.icon className="size-5" />
                    </div>
                    <Badge>{feature.badge}</Badge>
                  </div>
                  <h3 className="mt-4 text-2xl font-semibold text-ink">{feature.headline}</h3>
                  <p className="mt-3 text-sm leading-6 text-ink-muted">{feature.copy}</p>
                  <ul className="mt-4 grid gap-2">
                    {feature.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-2 text-sm leading-6 text-ink">
                        <ListChecks className="mt-1 size-4 shrink-0 text-accent" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="border-white/70 bg-[rgba(255,255,255,0.75)] p-6 sm:p-8">
              <Badge>Marketplace value</Badge>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                Not Just Planning. A Complete Party Ecosystem.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-muted sm:text-base">
                Party Swami brings together everything you need in one place. No more jumping between apps, websites, and vendors.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-border bg-canvas p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Without Party Swami</p>
                  <ul className="mt-3 grid gap-2 text-sm text-ink-muted">
                    <li>Multiple apps</li>
                    <li>Endless searching</li>
                    <li>Disconnected planning</li>
                  </ul>
                </div>
                <div className="rounded-3xl border border-accent/30 bg-accent-soft p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">With Party Swami</p>
                  <ul className="mt-3 grid gap-2 text-sm text-ink">
                    <li>One platform</li>
                    <li>AI-powered decisions</li>
                    <li>Integrated vendors and shopping</li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="border-white/70 bg-[rgba(252,246,235,0.8)] p-6 sm:p-8">
              <Badge>Built for scale</Badge>
              <h2 className="mt-4 text-2xl font-semibold text-ink sm:text-3xl">
                Built for Hosts, Vendors, and Planners
              </h2>
              <p className="mt-3 text-sm leading-6 text-ink-muted sm:text-base">
                Whether you&apos;re hosting your first party or running a professional event business, Party Swami scales with you.
              </p>
              <div className="mt-5 rounded-3xl bg-white/80 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Platform outcomes</p>
                <ul className="mt-3 grid gap-2 text-sm leading-6 text-ink">
                  <li>Faster setup from prompt to plan</li>
                  <li>Clear handoff from planning to execution</li>
                  <li>One system for hosts and service providers</li>
                </ul>
              </div>
            </Card>
          </section>

          <section className="space-y-4 rounded-[2rem] border border-white/70 bg-brand p-6 text-white shadow-party sm:p-8">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Start Planning Smarter Today</h2>
            <p className="max-w-3xl text-sm leading-6 text-white/80 sm:text-base">
              Create your event, explore vendors, and bring your party to life in minutes.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" variant="secondary">
                <Link href="/create-event">Start Your Party</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/vendors/signup">Join as a Vendor</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href="/planners/signup">Become a Planner</Link>
              </Button>
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-white/70 bg-white/55 p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">Footer entry points</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Link href="/create-event" className="rounded-2xl border border-border bg-white/75 px-4 py-3 text-sm font-medium text-ink transition hover:border-brand/40">
                For Hosts
              </Link>
              <Link href="/vendors/signup" className="rounded-2xl border border-border bg-white/75 px-4 py-3 text-sm font-medium text-ink transition hover:border-brand/40">
                For Vendors
              </Link>
              <Link href="/planners/signup" className="rounded-2xl border border-border bg-white/75 px-4 py-3 text-sm font-medium text-ink transition hover:border-brand/40">
                For Professional Planners
              </Link>
            </div>
          </section>
        </div>
      </ShellFrame>
    </>
  );
}
