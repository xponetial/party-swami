import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CalendarClock,
  CheckCheck,
  Mail,
  ShoppingBag,
  Wand2,
} from "lucide-react";
import { ShellFrame } from "@/components/layout/shell-frame";
import { DashboardPreviewButton } from "@/components/marketing/dashboard-preview-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const highlights = [
  {
    title: "Set up one event",
    description: "Start with the basics: event type, guest count, date, budget, and an optional theme.",
    icon: Wand2,
  },
  {
    title: "Watch AI fill in the blanks",
    description: "Generate invite copy, menu ideas, shopping categories, and a host checklist in one pass.",
    icon: Mail,
  },
  {
    title: "Run everything from one hub",
    description: "Track RSVP progress, shopping totals, and day-of tasks without leaving the dashboard.",
    icon: CheckCheck,
  },
];

export default function MarketingHomePage() {
  return (
    <ShellFrame
      brandVisual={
        <Link
          href="/"
          className="block overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#080c24] shadow-[0_24px_70px_rgba(7,11,34,0.32)]"
        >
          <Image
            src="/party-swami-banner.svg"
            alt="Party Swami celebration banner"
            width={1120}
            height={768}
            priority
            className="h-auto w-full max-w-[520px] object-cover"
          />
        </Link>
      }
    >
      <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="space-y-6 rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,rgba(245,223,255,0.34)_0%,rgba(237,243,255,0.94)_56%,rgba(228,239,255,0.98)_100%)] p-6 shadow-party">
          <Badge>Welcome and onboarding</Badge>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-ink sm:text-6xl">
              Turn a party idea into a full plan, invite, shopping list, and timeline in one guided flow.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-ink-muted">
              Party Swami is the AI planning workspace for hosts who want setup, invites, commerce,
              and event-day execution to live in the same product.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/signup">
                Start with your first event
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <DashboardPreviewButton />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="bg-[rgba(255,255,255,0.42)]">
              <p className="text-sm font-medium text-ink-muted">Best for</p>
              <p className="mt-2 text-lg font-semibold text-ink">
                Birthdays, brunches, showers, and holiday hosting
              </p>
            </Card>
            <Card className="bg-[rgba(255,255,255,0.42)]">
              <p className="text-sm font-medium text-ink-muted">MVP style</p>
              <p className="mt-2 text-lg font-semibold text-ink">
                Wizard-style setup with editable AI output
              </p>
            </Card>
            <Card className="bg-[rgba(255,255,255,0.42)]">
              <p className="text-sm font-medium text-ink-muted">Product promise</p>
              <p className="mt-2 text-lg font-semibold text-ink">
                Minimal input, maximum planning momentum
              </p>
            </Card>
          </div>
        </div>

        <Card className="overflow-hidden border-white/60 bg-[rgba(244,247,255,0.86)] p-0 shadow-party">
          <div className="border-b border-border px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-brand" />
                <span className="size-3 rounded-full bg-accent" />
                <span className="size-3 rounded-full bg-warning" />
              </div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">First-run preview</p>
            </div>
          </div>
          <div className="grid gap-5 p-6">
            <div className="rounded-[1.75rem] border border-border bg-white/90 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">
                    Optional first event
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-ink">
                    Summer backyard birthday
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-ink-muted">
                    18 guests, Saturday at 4:00 PM, sunny citrus palette, under $450.
                  </p>
                </div>
                <div className="rounded-2xl bg-accent-soft p-3 text-accent">
                  <CalendarClock className="size-5" />
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {["Theme preview", "Invite draft", "Checklist", "Shopping cart"].map((item) => (
                  <div key={item} className="rounded-2xl bg-canvas px-4 py-3 text-sm font-medium text-ink">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {highlights.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-border bg-white/80 p-5 transition-transform duration-200 hover:-translate-y-1"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-accent-soft p-3 text-accent">
                    <item.icon className="size-5" />
                  </div>
                  <h2 className="text-lg font-semibold text-ink">{item.title}</h2>
                </div>
                <p className="mt-3 text-sm leading-6 text-ink-muted">{item.description}</p>
              </div>
            ))}

            <div className="rounded-3xl bg-brand px-5 py-4 text-white">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-white/70">Embedded commerce</p>
                  <p className="mt-2 text-xl font-semibold">
                    Cart-ready shopping can hand off to Amazon or Walmart in one move.
                  </p>
                </div>
                <ShoppingBag className="size-8 shrink-0" />
              </div>
            </div>
          </div>
        </Card>
      </section>
    </ShellFrame>
  );
}
