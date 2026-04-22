import Link from "next/link";
import { Building2, DollarSign, Globe2, MapPin } from "lucide-react";
import { createVendorProfileAction } from "@/app/marketplace/actions";
import { ShellFrame } from "@/components/layout/shell-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { VENDOR_CATEGORIES } from "@/types/marketplace";

export default async function VendorSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <ShellFrame
      eyebrow="Vendor onboarding"
      title="Create a vendor storefront"
      description="Phase 3 starts with lead generation: list your service, receive qualified host requests, and handle payment directly while Party Swami tracks the lead."
    >
      <div className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
        <Card className="h-fit">
          <Badge>Recommended MVP model</Badge>
          <h2 className="mt-4 text-2xl font-semibold text-ink">Lead fee first, commission later</h2>
          <p className="mt-3 text-sm leading-6 text-ink-muted">
            Vendors can list fixed packages, custom quote services, or affiliate-style links. Stripe
            Connect and booking commissions are reserved for a later phase.
          </p>
          <p className="mt-3 rounded-3xl border border-border bg-white/55 p-4 text-sm leading-6 text-ink-muted">
            New storefronts are reviewed before they appear publicly. Questions? Email{" "}
            <a className="font-semibold text-brand" href="mailto:marketplace.admin@partyswami.com">
              marketplace.admin@partyswami.com
            </a>.
          </p>
          <div className="mt-5 grid gap-3">
            {[
              { icon: MapPin, text: "Matched by ZIP, city, and service radius" },
              { icon: Building2, text: "Public storefront for services and portfolio links" },
              { icon: DollarSign, text: "External payment disclaimer built into requests" },
            ].map((item) => (
              <div key={item.text} className="flex gap-3 rounded-3xl border border-border bg-white/55 p-4">
                <item.icon className="mt-0.5 size-4 shrink-0 text-brand" />
                <p className="text-sm leading-6 text-ink-muted">{item.text}</p>
              </div>
            ))}
          </div>
          <Button asChild className="mt-5 w-full" variant="secondary">
            <Link href="/vendors/dashboard">Open vendor dashboard</Link>
          </Button>
        </Card>

        <Card>
          <form action={createVendorProfileAction} className="grid gap-5">
            <div>
              <Badge>Storefront details</Badge>
              <h2 className="mt-4 text-2xl font-semibold text-ink">Tell hosts what you can deliver</h2>
            </div>
            {error ? (
              <p className="rounded-2xl border border-brand/20 bg-brand/10 px-4 py-3 text-sm text-brand">{error}</p>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="businessName">Business name</Label>
                <Input id="businessName" name="businessName" required placeholder="Austin Party Cakes" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select id="category" name="category" required className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand/50 focus:ring-4 focus:ring-brand/10">
                  {VENDOR_CATEGORIES.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pricingModel">Pricing model</Label>
                <select id="pricingModel" name="pricingModel" required className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand/50 focus:ring-4 focus:ring-brand/10">
                  <option value="fixed_packages">Fixed packages</option>
                  <option value="custom_quotes">Custom quotes</option>
                  <option value="affiliate_links">Affiliate links</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" required placeholder="Austin" />
              </div>
              <div className="grid grid-cols-[0.7fr_1fr] gap-3">
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" name="state" placeholder="TX" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP</Label>
                  <Input id="zipCode" name="zipCode" required inputMode="numeric" maxLength={5} placeholder="78701" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="serviceRadiusMiles">Service radius</Label>
                <Input id="serviceRadiusMiles" name="serviceRadiusMiles" type="number" min="1" max="250" defaultValue={25} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startingPrice">Starting price</Label>
                <Input id="startingPrice" name="startingPrice" type="number" min="0" step="0.01" placeholder="150" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact name</Label>
                <Input id="contactName" name="contactName" placeholder="Sam Rivera" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact email</Label>
                <Input id="contactEmail" name="contactEmail" required type="email" placeholder="hello@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact phone</Label>
                <Input id="contactPhone" name="contactPhone" placeholder="555-123-4567" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="websiteUrl">Website or Shopify link</Label>
                <div className="relative">
                  <Globe2 className="pointer-events-none absolute left-4 top-3.5 size-4 text-ink-muted" />
                  <Input id="websiteUrl" name="websiteUrl" className="pl-10" type="url" placeholder="https://example.com" />
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="affiliateUrl">Optional affiliate/referral link</Label>
                <Input id="affiliateUrl" name="affiliateUrl" type="url" placeholder="https://shop.example.com?ref=party-swami" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <textarea id="description" name="description" required rows={5} className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-muted focus:border-brand/50 focus:ring-4 focus:ring-brand/10" placeholder="Describe your packages, ideal event types, delivery area, and what makes your service useful for busy hosts." />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="portfolioUrls">Portfolio image URLs</Label>
                <textarea id="portfolioUrls" name="portfolioUrls" rows={3} className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-muted focus:border-brand/50 focus:ring-4 focus:ring-brand/10" placeholder="One URL per line, or comma-separated" />
              </div>
            </div>
            <SubmitButton pendingLabel="Creating storefront...">Create vendor storefront</SubmitButton>
          </form>
        </Card>
      </div>
    </ShellFrame>
  );
}
