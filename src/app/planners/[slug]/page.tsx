import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, CalendarClock, DollarSign, MapPin, ShieldCheck } from "lucide-react";
import { createMarketplaceLeadAction, createMarketplaceReviewAction } from "@/app/marketplace/actions";
import { ShellFrame } from "@/components/layout/shell-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { getLeadEventDefaults, getPlannerBySlug, getPlannerPackages, getPlannerReviews } from "@/lib/marketplace";

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
  const [planner, eventDefaults] = await Promise.all([
    getPlannerBySlug(slug),
    getLeadEventDefaults(query.eventId),
  ]);

  if (!planner) {
    notFound();
  }

  const [packages, reviews] = await Promise.all([
    getPlannerPackages(planner.id),
    getPlannerReviews(planner.id),
  ]);
  const averageRating = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : null;

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
                {averageRating ? (
                  <p className="mt-3 text-sm font-semibold text-ink">
                    {averageRating.toFixed(1)} stars from {reviews.length} review{reviews.length === 1 ? "" : "s"}
                  </p>
                ) : null}
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
                <p className="text-xs text-ink-muted">Usually responds in {planner.responseTimeHours}h</p>
              </div>
            </div>
            {planner.serviceNotes ? (
              <p className="mt-5 rounded-3xl border border-border bg-white/55 p-4 text-sm leading-6 text-ink-muted">
                {planner.serviceNotes}
              </p>
            ) : null}
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

          {packages.length ? (
            <Card>
              <Badge>Packages</Badge>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {packages.map((item) => (
                  <div key={item.id} className="rounded-3xl border border-border bg-white/65 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-ink">{item.title}</p>
                      <span className="rounded-full bg-canvas px-3 py-1 text-xs font-semibold text-ink">
                        {item.priceLabel ?? formatMoney(item.price)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-ink-muted">{item.description}</p>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {reviews.length ? (
            <Card>
              <Badge>Reviews</Badge>
              <div className="mt-5 grid gap-3">
                {reviews.map((review) => (
                  <div key={review.id} className="rounded-3xl border border-border bg-white/65 p-4">
                    <p className="text-sm font-semibold text-ink">{review.rating}/5 - {review.title}</p>
                    <p className="mt-2 text-sm leading-6 text-ink-muted">{review.body}</p>
                    {review.providerResponse ? (
                      <div className="mt-4 rounded-2xl bg-canvas px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-ink-muted">Provider response</p>
                        <p className="mt-2 text-sm leading-6 text-ink-muted">{review.providerResponse}</p>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
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
            {packages.length ? (
              <div className="space-y-2">
                <Label htmlFor="packageId">Package interest</Label>
                <select id="packageId" name="packageId" className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand/50 focus:ring-4 focus:ring-brand/10">
                  <option value="">Custom quote</option>
                  {packages.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} - {item.priceLabel ?? formatMoney(item.price)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
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
              <Input id="eventZipCode" name="eventZipCode" inputMode="numeric" maxLength={5} placeholder={planner.zipCode} defaultValue={eventDefaults?.eventZipCode ?? ""} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="eventType">Event type</Label>
                <Input id="eventType" name="eventType" placeholder="Baby shower" defaultValue={eventDefaults?.eventType ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">Budget</Label>
                <Input id="budget" name="budget" type="number" min="0" step="0.01" placeholder="2000" defaultValue={eventDefaults?.budget ?? ""} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">What do you need?</Label>
              <textarea id="message" name="message" required rows={4} className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-muted focus:border-brand/50 focus:ring-4 focus:ring-brand/10" placeholder="Share your date, guest count, budget, and where you want expert help." />
            </div>
            <label className="flex gap-3 rounded-2xl border border-border bg-white/70 p-4 text-sm leading-6 text-ink-muted">
              <input className="mt-1 size-4 accent-[#2f8fff]" name="marketplaceAgreement" required type="checkbox" value="accepted" />
              I understand Party Swami is a referral marketplace. This planner handles quotes, contracts, refunds, payment, and service delivery.
            </label>
            <SubmitButton pendingLabel="Sending request...">Send planner request</SubmitButton>
          </form>
          <form action={createMarketplaceReviewAction} className="mt-6 grid gap-3 rounded-3xl border border-border bg-white/60 p-4">
            <input type="hidden" name="providerType" value="planner" />
            <input type="hidden" name="providerId" value={planner.id} />
            <input type="hidden" name="eventId" value={query.eventId ?? ""} />
            <input type="hidden" name="returnTo" value={`/planners/${planner.slug}`} />
            <p className="text-sm font-semibold text-ink">Leave a review</p>
            <select name="rating" className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none">
              {[5, 4, 3, 2, 1].map((rating) => (
                <option key={rating} value={rating}>{rating} stars</option>
              ))}
            </select>
            <Input name="title" placeholder="Review title" required />
            <textarea name="body" required rows={3} className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none" placeholder="Share what worked well." />
            <Button type="submit" variant="secondary">Submit review</Button>
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
