"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Mail,
  ShoppingCart,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const metrics = [
  {
    label: "Events",
    value: "04",
    detail: "Active planning workspaces",
    icon: CalendarDays,
  },
  {
    label: "Guests",
    value: "87",
    detail: "Across upcoming events",
    icon: Mail,
  },
  {
    label: "Tasks",
    value: "23",
    detail: "Tracked with due dates",
    icon: CheckCircle2,
  },
  {
    label: "Shopping",
    value: "12",
    detail: "Items ready to buy",
    icon: ShoppingCart,
  },
];

const previewEvents = [
  {
    title: "Rohan's Pool Party",
    status: "Planning",
    date: "Saturday, April 18 at 3:00 PM",
    detail: "Invite draft approved, shopping at 70%, reminders ready to send.",
  },
  {
    title: "Valentine's Day Celebration",
    status: "Ready",
    date: "Thursday, April 30 at 6:00 PM",
    detail: "Guest list locked, RSVP flow live, timeline finalized.",
  },
];

export function DashboardPreviewButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="lg" type="button" variant="secondary" onClick={() => setOpen(true)}>
        Preview the host dashboard
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d1438]/45 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,rgba(245,223,255,0.48)_0%,rgba(237,243,255,0.97)_56%,rgba(228,239,255,1)_100%)] shadow-[0_30px_90px_rgba(13,20,56,0.28)]">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-5 top-5 z-10 rounded-full border border-white/70 bg-white/60 p-2 text-ink-muted transition hover:text-ink"
              aria-label="Close dashboard preview"
            >
              <X className="size-5" />
            </button>

            <div className="grid max-h-[90vh] gap-0 overflow-y-auto lg:grid-cols-[0.34fr_0.66fr]">
              <div className="border-b border-white/50 bg-[linear-gradient(180deg,rgba(247,213,255,0.82)_0%,rgba(236,225,255,0.78)_30%,rgba(223,237,255,0.82)_68%,rgba(206,229,255,0.88)_100%)] p-6 lg:border-b-0 lg:border-r">
                <p className="text-xs uppercase tracking-[0.22em] text-ink-muted">
                  Host dashboard preview
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
                  See the workspace before signup
                </h2>
                <p className="mt-3 text-sm leading-7 text-ink-muted">
                  This is a static preview of the Party Swami host dashboard. Signup is still the
                  next step to create your real event workspace, save plans, and send invites.
                </p>

                <div className="mt-6 rounded-[1.75rem] border border-white/70 bg-white/35 p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">
                    What hosts manage here
                  </p>
                  <div className="mt-4 space-y-3">
                    {[
                      "Recent events with quick status controls",
                      "AI-generated plan summary and revisions",
                      "Guest messaging, reminders, and RSVP tracking",
                      "Shopping, tasks, telemetry, and completion flow",
                    ].map((item) => (
                      <div
                        key={item}
                        className="rounded-2xl border border-white/70 bg-white/35 px-4 py-3 text-sm text-ink-muted"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3">
                  <Button asChild size="lg">
                    <Link href="/signup">
                      Create your account
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                    Keep exploring the site
                  </Button>
                </div>
              </div>

              <div className="p-6">
                <div className="rounded-[1.75rem] border border-white/70 bg-[linear-gradient(135deg,rgba(245,223,255,0.3)_0%,rgba(237,243,255,0.94)_58%,rgba(228,239,255,0.98)_100%)] p-5 shadow-party">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">
                        Party Swami workspace
                      </p>
                      <h3 className="mt-2 text-3xl font-semibold text-ink">Dashboard</h3>
                      <p className="mt-2 text-sm leading-6 text-ink-muted">
                        Live event health, AI planning, guest messaging, and host execution in one
                        place.
                      </p>
                    </div>
                    <div className="rounded-full bg-accent-soft px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-accent">
                      Static preview
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-4">
                    {metrics.map((metric) => (
                      <div
                        key={metric.label}
                        className="rounded-[1.5rem] border border-white/70 bg-white/35 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">
                              {metric.label}
                            </p>
                            <p className="mt-2 text-3xl font-semibold text-ink">{metric.value}</p>
                          </div>
                          <div className="rounded-2xl bg-accent-soft p-3 text-accent">
                            <metric.icon className="size-4" />
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-ink-muted">{metric.detail}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_0.92fr]">
                    <div className="rounded-[1.5rem] border border-white/70 bg-white/35 p-5">
                      <p className="text-sm font-semibold text-ink">Recent events</p>
                      <div className="mt-4 space-y-3">
                        {previewEvents.map((event) => (
                          <div
                            key={event.title}
                            className="rounded-[1.25rem] border border-white/70 bg-white/35 p-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-lg font-semibold text-ink">{event.title}</p>
                              <span className="rounded-full bg-accent-soft px-3 py-1 text-xs uppercase tracking-[0.18em] text-accent">
                                {event.status}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-ink-muted">{event.date}</p>
                            <p className="mt-3 text-sm leading-6 text-ink-muted">{event.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-white/70 bg-white/35 p-5">
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-accent-soft p-3 text-accent">
                          <Sparkles className="size-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-ink">Latest AI summary</p>
                          <p className="text-sm text-ink-muted">
                            The assistant keeps plans, invites, and checklists moving.
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 rounded-[1.25rem] border border-white/70 bg-white/40 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Theme</p>
                        <p className="mt-2 text-xl font-semibold text-ink">Cabana birthday splash</p>
                      </div>

                      <div className="mt-4 rounded-[1.25rem] border border-white/70 bg-white/40 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">
                          Invite snapshot
                        </p>
                        <p className="mt-2 text-sm leading-7 text-ink-muted">
                          You&apos;re invited to Rohan&apos;s Pool Party. Join us for a breezy
                          cabana birthday splash with sunset snacks, signature drinks, and easy RSVP
                          tracking.
                        </p>
                      </div>

                      <div className="mt-4 space-y-3">
                        {[
                          "Checklist with event-week reminders",
                          "Shopping categories with retailer handoff",
                          "Guest reminders and RSVP receipts",
                        ].map((item) => (
                          <div
                            key={item}
                            className="rounded-[1.25rem] border border-white/70 bg-white/40 px-4 py-3 text-sm text-ink-muted"
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
