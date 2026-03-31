import Link from "next/link";
import { CalendarDays, CheckCircle2, Mail, ShoppingCart, Users } from "lucide-react";
import { DashboardMetricCard } from "@/components/dashboard/dashboard-metric-card";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const metrics = [
  { label: "Events", value: "01", detail: "Birthday brunch in progress", icon: CalendarDays },
  { label: "Guests", value: "24", detail: "16 confirmed, 5 maybe, 3 pending", icon: Users },
  { label: "Tasks", value: "09", detail: "9 of 12 complete", icon: CheckCircle2 },
  { label: "Shopping", value: "$186", detail: "Estimated against a $450 budget", icon: ShoppingCart },
];

export default function DashboardPage() {
  return (
    <AppShell
      title="Dashboard"
      description="The event overview hub with progress, RSVP health, shopping visibility, and quick host actions."
      actions={
        <Button asChild>
          <Link href="/events/new">Create event</Link>
        </Button>
      }
    >
      <div className="grid gap-4 xl:grid-cols-4">
        {metrics.map((metric) => (
          <DashboardMetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <DashboardPanel title="Active event" description="A single source of truth for the host as the event gets closer.">
          <div className="rounded-3xl border border-border bg-white/75 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xl font-semibold">Ava&apos;s Garden Birthday</p>
                <p className="mt-1 text-sm text-ink-muted">Saturday, June 13 at 2:00 PM in Austin, TX</p>
              </div>
              <Badge variant="success">On track</Badge>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-canvas px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Budget</p>
                <p className="mt-2 font-semibold">$186 of $450 estimated</p>
              </div>
              <div className="rounded-2xl bg-canvas px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Invite status</p>
                <p className="mt-2 font-semibold">16 yes, 5 maybe</p>
              </div>
              <div className="rounded-2xl bg-canvas px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Shopping</p>
                <p className="mt-2 font-semibold">11 of 26 items purchased</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { href: "/events/sample/invite", label: "Send reminder" },
                { href: "/events/sample/shopping", label: "Add item" },
                { href: "/events/new", label: "Edit event" },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="rounded-full border border-border bg-white px-4 py-3 text-center text-sm font-medium text-ink transition hover:border-brand/40 hover:text-brand"
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Progress" description="Fast-glance indicators for the host on desktop or mobile.">
          <div className="space-y-3">
            {[
              "Invite design is approved and the share link is ready to send",
              "Shopping cart is 41% complete with retailer switching available",
              "Two tasks are due this week and one lands on event morning",
              "Budget still has room for dessert upgrades and fresh florals",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-border bg-white/75 px-4 py-3">
                <Mail className="mt-0.5 size-4 text-brand" />
                <p className="text-sm leading-6 text-ink-muted">{item}</p>
              </div>
            ))}
          </div>
        </DashboardPanel>
      </div>
    </AppShell>
  );
}
