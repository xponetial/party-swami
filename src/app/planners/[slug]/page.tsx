import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, CalendarClock, DollarSign, MapPin, ShieldCheck } from "lucide-react";
import { createMarketplaceLeadAction } from "@/app/marketplace/actions";
import { ShellFrame } from "@/components/layout/shell-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { getPlannerBySlug } from "@/lib/marketplace";

function formatMoney(value: number | null) {
  if (value == null) return "Custom";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export default async function PlannerProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ created?: string; lead?: string; error?: string; eventId?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const planner = await getPlannerBySlug(slug);

  if (!planner) {
    notFound();
  }

  return (
    <ShellFrame
      eyebrow="Planner profile"
      title={planner.businessName}
      description={`Professional planning from ${planner.city}${planner.state ? `, ${planner.state}` : ""}. Consultations and full-service requests are handled as tracked leads in Phase 3.`}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_0.82fr]">
        <div className="grid gap-5">
          {(query.created || query.lead || query.error) ? (
            <Card className={query.error ? "border-brand/30 bg-brand/10" : "border-white/80 bg-white/70"}>
              <p className="text-sm font-medium text-ink">
                {query.error ? query.error : query.lead ? "Your request was sent. The planner can follow up directly." : "Planner profile created and visible in the marketplace."}
              </p>
            </Card>
          ) : null}

          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Badge>Professional planner</Badge>
                <h2 className="mt-4 text-3xl font-semibold text-ink">{planner.businessName}</h2>
                <p className="mt-2 text-sm font-medium text-ink-muted">{planner.contactName}</p>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-muted">{planner.bio}</p>
              </div>
              {planner.isVerified ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-medium text-ink">
                  <ShieldCheck className="size-4 text-brand" />
                  Verified
                </span>
              ) : null}
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-border bg-white/60 p-4">
                <MapPin className="size-5 text-brand" />
                <p className="mt-3 text-sm font-semibold text-ink">{planner.city}, {planner.state ?? planner.zipCode}</p>
                <p className="text-xs text-ink-muted">{planner.serviceRadiusMiles} mile radius</p>
              </div>
              <div className="rounded-3xl border border-border bg-white/60 p-4">
                <CalendarClock className="size-5 text-brand" />
                <p className="mt-3 text-sm font-semibold text-ink">{planner.yearsExperience ?? "New"} years</p>
                <p className="text-xs text-ink-muted">{planner.availabilityNote ?? "Availability by request"}</p>
              </div>
              <div className="rounded-3xl border border-border bg-white/60 p-4">
                <DollarSign className="size-5 text-brand" />
                <p className="mt-3 text-sm font-semibold text-ink">{formatMoney(planner.consultationPrice)}</p>
                <p className="text-xs text-ink-muted">Consultation starting point</p>
              </div>
            </div>
          </Card>

          <Card>
            <Badge>Services</Badge>
            <div className="mt-5 flex flex-wrap gap-2">
              {(planner.services.length ? planner.services : ["Consultation", "Full-service planning"]).map((service) => (
                <span key={service} className="rounded-full border border-border bg-white/65 px-4 py-2 text-sm text-ink-muted">
                  {service}
                </span>
              ))}
            </div>
            {planner.certifications ? (
              <p className="mt-5 rounded-3xl border border-border bg-white/55 p-4 text-sm leading-6 text-ink-muted">
                {planner.certifications}
              </p>
            ) : null}
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <p className="rounded-3xl bg-white/55 p-4 text-sm text-ink-muted">Hourly: <span className="font-semibold text-ink">{formatMoney(planner.hourlyRate)}</span></p>
              <p className="rounded-3xl bg-white/55 p-4 text-sm text-ink-muted">Full-service min: <span className="font-semibold text-ink">{formatMoney(planner.fullServiceMinimum)}</span></p>
              <p className="rounded-3xl bg-white/55 p-4 text-sm text-ink-muted">Platform fee target: <span className="font-semibold text-ink">10%</span></p>
            </div>
          </Card>
        </div>

        <Card className="h-fit">
          <Badge>Request planner help</Badge>
          <h2 className="mt-4 text-2xl font-semibold text-ink">Choose a service path</h2>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            Party Swami records the lead. The planner is responsible for quotes, scope, contracts, and payment handling in Phase 3.
          </p>
          <form action={createMarketplaceLeadAction} className="mt-5 grid gap-4">
            <input type="hidden" name="providerType" value="planner" />
            <input type="hidden" name="providerId" value={planner.id} />
            <input type="hidden" name="returnTo" value={`/planners/${planner.slug}`} />
            <input type="hidden" name="eventId" value={query.eventId ?? ""} />
            <div className="space-y-2">
              <Label htmlFor="leadType">Help type</Label>
              <select id="leadType" name="leadType" className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand/50 focus:ring-4 focus:ring-brand/10">
                <option value="planner_consultation">Quick consultation</option>
                <option value="planner_full_service">Full-service planning quote</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactName">Your name</Label>
              <Input id="contactName" name="contactName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Email</Label>
              <Input id="contactEmail" name="contactEmail" required type="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eventZipCode">Event ZIP</Label>
              <Input id="eventZipCode" name="eventZipCode" inputMode="numeric" maxLength={5} placeholder={planner.zipCode} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="eventType">Event type</Label>
                <Input id="eventType" name="eventType" placeholder="Baby shower" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">Budget</Label>
                <Input id="budget" name="budget" type="number" min="0" step="0.01" placeholder="2000" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">What do you need?</Label>
              <textarea id="message" name="message" required rows={4} className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-muted focus:border-brand/50 focus:ring-4 focus:ring-brand/10" placeholder="Share your date, guest count, budget, and where you want expert help." />
            </div>
            <SubmitButton pendingLabel="Sending request...">Send planner request</SubmitButton>
          </form>
          <div className="mt-5 flex flex-wrap gap-3">
            {planner.websiteUrl ? (
              <Button asChild variant="secondary">
                <a href={planner.websiteUrl} target="_blank" rel="noreferrer">
                  Website
                  <ArrowUpRight className="size-4" />
                </a>
              </Button>
            ) : null}
            <Button asChild variant="ghost">
              <Link href="/marketplace">Back to marketplace</Link>
            </Button>
          </div>
        </Card>
      </div>
    </ShellFrame>
  );
}
