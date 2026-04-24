import Link from "next/link";
import { ArrowRight, Handshake, ShoppingBag, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getEventContext } from "@/lib/events";
import { getPlanners } from "@/lib/marketplace";

function extractZip(value: string | null) {
  return value?.match(/\b\d{5}\b/)?.[0] ?? "";
}

export default async function EventNextStepsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { event, shoppingList } = await getEventContext(eventId);
  const eventZip = extractZip(event.location);
  const planners = await getPlanners({ zip: eventZip || undefined });
  const topPlanners = planners.slice(0, 3);

  return (
    <AppShell
      title="Pick how you want to execute"
      description="Choose DIY shopping, professional planner help, or both before diving into the shopping list."
      backHref={`/events/${eventId}`}
      eventNav={{ eventId, eventTitle: event.title, active: "next-steps" }}
    >
      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <Badge>Path 1</Badge>
          <div className="mt-5 rounded-3xl bg-white/55 p-4 text-brand">
            <ShoppingBag className="size-7" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-ink">DIY shopping</h2>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            Continue with affiliate shopping, AI recommendations, and the current event checklist.
          </p>
          <div className="mt-5 rounded-3xl border border-border bg-white/60 p-4 text-sm text-ink-muted">
            Estimated list: <span className="font-semibold text-ink">${shoppingList?.estimated_total ?? 0}</span>
          </div>
          <Button asChild className="mt-5 w-full">
            <Link href={`/events/${eventId}/shopping`}>
              Open shopping list
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </Card>

        <Card className="xl:col-span-1">
          <Badge>Path 2</Badge>
          <div className="mt-5 rounded-3xl bg-white/55 p-4 text-accent">
            <Handshake className="size-7" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-ink">Professional planner help</h2>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            Start with a consultation or ask for a full-service quote. Payment stays between host and planner in Phase 3.
          </p>
          <div className="mt-5 grid gap-2">
            {topPlanners.map((planner) => (
              <Link key={planner.id} href={`/planners/${planner.slug}?eventId=${eventId}`} className="rounded-2xl border border-border bg-white/65 px-4 py-3 text-sm font-medium text-ink transition hover:border-brand/35">
                {planner.businessName}
              </Link>
            ))}
            {!topPlanners.length ? (
              <p className="rounded-2xl border border-border bg-white/65 px-4 py-3 text-sm text-ink-muted">
                No local planner profiles yet.
              </p>
            ) : null}
          </div>
          <Button asChild variant="secondary" className="mt-5 w-full">
            <Link href={`/events/${eventId}/planners`}>
              Browse all planners
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </Card>

        <Card className="xl:col-span-1">
          <Badge>Path 3</Badge>
          <div className="mt-5 rounded-3xl bg-white/55 p-4 text-brand">
            <Sparkles className="size-7" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-ink">Both</h2>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            Keep the DIY shopping list handy while a professional planner fills in the rest.
          </p>
          <div className="mt-5 rounded-3xl border border-border bg-white/60 p-4 text-sm text-ink-muted">
            Start with shopping, then reach out to a planner anytime for the pieces you&apos;d rather hand off.
          </div>
          <div className="mt-5 grid gap-2">
            <Button asChild className="w-full">
              <Link href={`/events/${eventId}/shopping`}>
                Open shopping list
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" className="w-full">
              <Link href={`/events/${eventId}/planners`}>Browse planners</Link>
            </Button>
          </div>
        </Card>
      </section>

      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge>AI marketplace assist</Badge>
            <h2 className="mt-4 text-2xl font-semibold text-ink">Next recommendations can use event context</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">
              This screen is ready for the PRD&apos;s AI layer: recommend planner matches from event type,
              budget, guest count, and ZIP, then hand leads to providers.
            </p>
          </div>
          <div className="rounded-3xl bg-[linear-gradient(135deg,_rgba(38,146,255,0.96),_rgba(139,70,255,0.92))] p-5 text-white">
            <Sparkles className="size-6" />
            <p className="mt-3 text-sm font-semibold">Event: {event.event_type}</p>
            <p className="mt-1 text-sm text-white/80">ZIP: {eventZip || "Add a ZIP to improve matching"}</p>
          </div>
        </div>
      </Card>
    </AppShell>
  );
}
