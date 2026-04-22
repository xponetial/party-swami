import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, BadgeDollarSign, Mail, MapPin, ShieldCheck } from "lucide-react";
import { createMarketplaceLeadAction, createMarketplaceReviewAction } from "@/app/marketplace/actions";
import { ShellFrame } from "@/components/layout/shell-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { getLeadEventDefaults, getVendorBySlug, getVendorPackages, getVendorReviews } from "@/lib/marketplace";

function formatMoney(value: number | null) {
  if (value == null) return "Custom quote";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function pricingLabel(model: string) {
  if (model === "fixed_packages") return "Fixed packages";
  if (model === "affiliate_links") return "Affiliate/referral links";
  return "Custom quotes";
}

export default async function VendorProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ created?: string; lead?: string; error?: string; eventId?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const [vendor, eventDefaults] = await Promise.all([
    getVendorBySlug(slug),
    getLeadEventDefaults(query.eventId),
  ]);

  if (!vendor) {
    notFound();
  }

  const [packages, reviews] = await Promise.all([
    getVendorPackages(vendor.id),
    getVendorReviews(vendor.id),
  ]);
  const averageRating = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : null;

  return (
    <ShellFrame
      eyebrow="Vendor storefront"
      title={vendor.businessName}
      description={`${vendor.category} serving ${vendor.city}${vendor.state ? `, ${vendor.state}` : ""} within ${vendor.serviceRadiusMiles} miles.`}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_0.82fr]">
        <div className="grid gap-5">
          {(query.created || query.lead || query.error) ? (
            <Card className={query.error ? "border-brand/30 bg-brand/10" : "border-white/80 bg-white/70"}>
              <p className="text-sm font-medium text-ink">
                {query.error ? query.error : query.lead ? "Your request was sent. The vendor can follow up directly." : "Storefront created and visible in the marketplace."}
              </p>
            </Card>
          ) : null}

          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Badge>{vendor.category}</Badge>
                <h2 className="mt-4 text-3xl font-semibold text-ink">{vendor.businessName}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-muted">{vendor.description}</p>
              {averageRating ? (
                <p className="mt-3 text-sm font-semibold text-ink">
                  {averageRating.toFixed(1)} stars from {reviews.length} review{reviews.length === 1 ? "" : "s"}
                </p>
              ) : null}
              </div>
              {vendor.isVerified ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-medium text-ink">
                  <ShieldCheck className="size-4 text-brand" />
                  Verified
                </span>
              ) : null}
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-border bg-white/60 p-4">
                <MapPin className="size-5 text-brand" />
                <p className="mt-3 text-sm font-semibold text-ink">{vendor.city}, {vendor.state ?? vendor.zipCode}</p>
                <p className="text-xs text-ink-muted">{vendor.serviceRadiusMiles} mile radius</p>
              </div>
              <div className="rounded-3xl border border-border bg-white/60 p-4">
                <BadgeDollarSign className="size-5 text-brand" />
                <p className="mt-3 text-sm font-semibold text-ink">{formatMoney(vendor.startingPrice)}</p>
                <p className="text-xs text-ink-muted">{pricingLabel(vendor.pricingModel)}</p>
              </div>
              <div className="rounded-3xl border border-border bg-white/60 p-4">
                <Mail className="size-5 text-brand" />
                <p className="mt-3 text-sm font-semibold text-ink">Lead request</p>
                <p className="text-xs text-ink-muted">Usually responds in {vendor.responseTimeHours}h</p>
              </div>
            </div>
            {vendor.serviceNotes ? (
              <p className="mt-5 rounded-3xl border border-border bg-white/55 p-4 text-sm leading-6 text-ink-muted">
                {vendor.serviceNotes}
              </p>
            ) : null}
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

          {vendor.portfolioUrls.length ? (
            <Card>
              <Badge>Portfolio links</Badge>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {vendor.portfolioUrls.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-3xl border border-border bg-white/65 p-4 text-sm font-medium text-ink transition hover:border-brand/35">
                    View work
                    <ArrowUpRight className="size-4" />
                  </a>
                ))}
              </div>
            </Card>
          ) : null}
        </div>

        <Card className="h-fit">
          <Badge>Request intro</Badge>
          <h2 className="mt-4 text-2xl font-semibold text-ink">Ask about availability</h2>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            Party Swami records the lead. The vendor is responsible for quotes, contracts, service delivery, and payment handling.
          </p>
          <form action={createMarketplaceLeadAction} className="mt-5 grid gap-4">
            <input type="hidden" name="providerType" value="vendor" />
            <input type="hidden" name="providerId" value={vendor.id} />
            <input type="hidden" name="leadType" value="vendor" />
            <input type="hidden" name="returnTo" value={`/vendors/${vendor.slug}`} />
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
              <Label htmlFor="contactName">Your name</Label>
              <Input id="contactName" name="contactName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Email</Label>
              <Input id="contactEmail" name="contactEmail" required type="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eventZipCode">Event ZIP</Label>
              <Input id="eventZipCode" name="eventZipCode" inputMode="numeric" maxLength={5} placeholder={vendor.zipCode} defaultValue={eventDefaults?.eventZipCode ?? ""} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="eventType">Event type</Label>
                <Input id="eventType" name="eventType" placeholder="Birthday" defaultValue={eventDefaults?.eventType ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">Budget</Label>
                <Input id="budget" name="budget" type="number" min="0" step="0.01" placeholder="500" defaultValue={eventDefaults?.budget ?? ""} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">What do you need?</Label>
              <textarea id="message" name="message" required rows={4} className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-muted focus:border-brand/50 focus:ring-4 focus:ring-brand/10" placeholder="Share your date, guest count, and what you want quoted." />
            </div>
            <label className="flex gap-3 rounded-2xl border border-border bg-white/70 p-4 text-sm leading-6 text-ink-muted">
              <input className="mt-1 size-4 accent-[#2f8fff]" name="marketplaceAgreement" required type="checkbox" value="accepted" />
              I understand Party Swami is a referral marketplace. This provider handles quotes, contracts, refunds, payment, and service delivery.
            </label>
            <SubmitButton pendingLabel="Sending request...">Send request</SubmitButton>
          </form>
          <form action={createMarketplaceReviewAction} className="mt-6 grid gap-3 rounded-3xl border border-border bg-white/60 p-4">
            <input type="hidden" name="providerType" value="vendor" />
            <input type="hidden" name="providerId" value={vendor.id} />
            <input type="hidden" name="eventId" value={query.eventId ?? ""} />
            <input type="hidden" name="returnTo" value={`/vendors/${vendor.slug}`} />
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
            {vendor.websiteUrl ? (
              <Button asChild variant="secondary">
                <a href={vendor.websiteUrl} target="_blank" rel="noreferrer">
                  Website
                  <ArrowUpRight className="size-4" />
                </a>
              </Button>
            ) : null}
            {vendor.affiliateUrl ? (
              <Button asChild variant="ghost">
                <a href={vendor.affiliateUrl} target="_blank" rel="noreferrer">Shop link</a>
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
