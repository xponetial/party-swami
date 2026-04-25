import Link from "next/link";
import { ArrowRight, CalendarClock, Clock, DollarSign, MapPin, Search, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getEventContext } from "@/lib/events";
import { getPlanners } from "@/lib/marketplace";

function extractZip(value: string | null) {
  return value?.match(/\b\d{5}\b/)?.[0] ?? "";
}

function formatMoney(value: number | null) {
  if (value == null) return "Custom";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function EventPlannerSearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ zip?: string }>;
}) {
  const [{ eventId }, query] = await Promise.all([params, searchParams]);
  const { event } = await getEventContext(eventId);
  const defaultZip = extractZip(event.location);
  const searchZip = query.zip?.trim().match(/\b\d{5}\b/)?.[0] ?? defaultZip;
  const planners = await getPlanners({ zip: searchZip || undefined });

  return (
    <AppShell
      title="Find a planner"
      description="Browse professional party planners near your event. Open a profile for packages, pricing, and to request a consultation."
      backHref={`/events/${eventId}`}
      eventNav={{ eventId, eventTitle: event.title, active: "planners" }}
    >
      <Card data-tour-id="planners-search">
        <form method="get" className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <Label htmlFor="zip">Search ZIP</Label>
            <Input
              id="zip"
              name="zip"
              defaultValue={searchZip}
              placeholder="e.g. 94110"
              inputMode="numeric"
              maxLength={5}
            />
            <p className="mt-2 text-xs text-ink-muted">
              {defaultZip
                ? `Pre-filled from the event ZIP (${defaultZip}). Change it to search another area.`
                : "Add a ZIP to your event location to pre-fill this search."}
            </p>
          </div>
          <Button type="submit">
            <Search className="size-4" />
            Search planners
          </Button>
        </form>
      </Card>

      <section data-tour-id="planners-results" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {planners.map((planner) => (
          <Card key={planner.id} className="flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-ink">{planner.businessName}</h2>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                  <MapPin className="size-3.5" />
                  {planner.city}
                  {planner.state ? `, ${planner.state}` : ""}
                  {planner.distanceMiles != null ? ` · ${Math.round(planner.distanceMiles)} mi` : ""}
                </p>
              </div>
              {planner.isVerified ? (
                <Badge variant="success">
                  <ShieldCheck className="mr-1 size-3.5" />
                  Verified
                </Badge>
              ) : null}
            </div>

            <p className="mt-3 line-clamp-3 text-sm leading-6 text-ink-muted">{planner.bio}</p>

            <div className="mt-4 grid gap-1.5 text-xs text-ink-muted">
              <div className="flex items-center gap-1.5">
                <DollarSign className="size-3.5" />
                <span>Consultation: <span className="font-semibold text-ink">{formatMoney(planner.consultationPrice)}</span></span>
              </div>
              {planner.hourlyRate != null ? (
                <div className="flex items-center gap-1.5">
                  <DollarSign className="size-3.5" />
                  <span>Hourly: <span className="font-semibold text-ink">{formatMoney(planner.hourlyRate)}</span></span>
                </div>
              ) : null}
              <div className="flex items-center gap-1.5">
                <Clock className="size-3.5" />
                <span>Responds in ~{planner.responseTimeHours}h</span>
              </div>
              {planner.yearsExperience != null ? (
                <div className="flex items-center gap-1.5">
                  <CalendarClock className="size-3.5" />
                  <span>{planner.yearsExperience} yrs experience</span>
                </div>
              ) : null}
            </div>

            {planner.services.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {planner.services.slice(0, 4).map((service) => (
                  <span
                    key={service}
                    className="rounded-full bg-canvas px-2 py-0.5 text-xs text-ink-muted"
                  >
                    {service}
                  </span>
                ))}
              </div>
            ) : null}

            <Button asChild className="mt-5 w-full">
              <Link href={`/planners/${planner.slug}?eventId=${eventId}`}>
                View profile
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </Card>
        ))}

        {!planners.length ? (
          <Card className="md:col-span-2 xl:col-span-3">
            <p className="text-sm leading-6 text-ink-muted">
              No planner profiles found{searchZip ? ` near ${searchZip}` : ""}. Try a different ZIP or clear the filter to see all active planners.
            </p>
            {searchZip ? (
              <Button asChild variant="secondary" className="mt-4">
                <Link href={`/events/${eventId}/planners`}>Clear ZIP filter</Link>
              </Button>
            ) : null}
          </Card>
        ) : null}
      </section>

      <Card data-tour-id="planners-next-step" className="bg-white/80">
        <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Next step</p>
        <h3 className="mt-2 text-xl font-semibold text-ink">Turn the plan into a host-ready timeline</h3>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Once you&apos;ve reached out to a planner or decided to run the party yourself, move into the timeline to lock your checklist and day-of run-of-show.
        </p>
        <Button asChild className="mt-4">
          <Link href={`/events/${eventId}/timeline`}>Next: Timeline and tasks</Link>
        </Button>
      </Card>
    </AppShell>
  );
}
