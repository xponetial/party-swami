import Link from "next/link";
import { CalendarClock, Handshake, MapPin } from "lucide-react";
import { createPlannerProfileAction } from "@/app/marketplace/actions";
import { ShellFrame } from "@/components/layout/shell-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { PLANNER_SERVICES } from "@/types/marketplace";

export default async function PlannerSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <ShellFrame
      eyebrow="Planner onboarding"
      title="Create a professional planner profile"
      description="Offer quick consultations or full-service planning. Phase 3 tracks leads while payments happen externally."
    >
      <div className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
        <Card className="h-fit">
          <Badge>Planner marketplace</Badge>
          <h2 className="mt-4 text-2xl font-semibold text-ink">Two service tiers</h2>
          <p className="mt-3 text-sm leading-6 text-ink-muted">
            Consultations give hosts fast expert help. Full-service requests create a quote-led path
            where Party Swami can later introduce a 10% commission model.
          </p>
          <p className="mt-3 rounded-3xl border border-border bg-white/55 p-4 text-sm leading-6 text-ink-muted">
            New planner profiles are reviewed before they appear publicly. Questions? Email{" "}
            <a className="font-semibold text-brand" href="mailto:marketplace.admin@partyswami.com">
              marketplace.admin@partyswami.com
            </a>.
          </p>
          <div className="mt-5 grid gap-3">
            {[
              { icon: CalendarClock, text: "Set consultation, hourly, and full-service starting points" },
              { icon: MapPin, text: "Match against event ZIP and planner service radius" },
              { icon: Handshake, text: "Use leads now, add Stripe Connect in Phase 4" },
            ].map((item) => (
              <div key={item.text} className="flex gap-3 rounded-3xl border border-border bg-white/55 p-4">
                <item.icon className="mt-0.5 size-4 shrink-0 text-brand" />
                <p className="text-sm leading-6 text-ink-muted">{item.text}</p>
              </div>
            ))}
          </div>
          <Button asChild className="mt-5 w-full" variant="secondary">
            <Link href="/planners/dashboard">Open planner dashboard</Link>
          </Button>
        </Card>

        <Card>
          <form action={createPlannerProfileAction} className="grid gap-5">
            <div>
              <Badge>Profile details</Badge>
              <h2 className="mt-4 text-2xl font-semibold text-ink">Show hosts how you help</h2>
            </div>
            {error ? (
              <p className="rounded-2xl border border-brand/20 bg-brand/10 px-4 py-3 text-sm text-brand">{error}</p>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business name</Label>
                <Input id="businessName" name="businessName" required placeholder="Bright Table Events" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact name</Label>
                <Input id="contactName" name="contactName" required placeholder="Jordan Lee" />
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
                <Input id="serviceRadiusMiles" name="serviceRadiusMiles" type="number" min="1" max="250" defaultValue={35} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearsExperience">Years experience</Label>
                <Input id="yearsExperience" name="yearsExperience" type="number" min="0" placeholder="5" />
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
                <Label htmlFor="websiteUrl">Website</Label>
                <Input id="websiteUrl" name="websiteUrl" type="url" placeholder="https://example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="consultationPrice">Consultation price</Label>
                <Input id="consultationPrice" name="consultationPrice" type="number" min="0" step="0.01" placeholder="75" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hourlyRate">Hourly rate</Label>
                <Input id="hourlyRate" name="hourlyRate" type="number" min="0" step="0.01" placeholder="125" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullServiceMinimum">Full-service minimum</Label>
                <Input id="fullServiceMinimum" name="fullServiceMinimum" type="number" min="0" step="0.01" placeholder="2000" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Services</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {PLANNER_SERVICES.map((service) => (
                    <label key={service} className="flex items-center gap-3 rounded-2xl border border-border bg-white/65 px-4 py-3 text-sm text-ink-muted">
                      <input type="checkbox" name="services" value={service} className="size-4 accent-[#2f8fff]" />
                      {service}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="certifications">Certifications</Label>
                <Input id="certifications" name="certifications" placeholder="Optional certifications, memberships, or specialties" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="bio">Bio</Label>
                <textarea id="bio" name="bio" required rows={5} className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-muted focus:border-brand/50 focus:ring-4 focus:ring-brand/10" placeholder="Describe your planning style, event strengths, and what a host can expect from a consultation or full-service package." />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="availabilityNote">Availability note</Label>
                <Input id="availabilityNote" name="availabilityNote" placeholder="Weekday consults, weekend events, 2-week notice preferred..." />
              </div>
            </div>
            <SubmitButton pendingLabel="Creating profile...">Create planner profile</SubmitButton>
          </form>
        </Card>
      </div>
    </ShellFrame>
  );
}
