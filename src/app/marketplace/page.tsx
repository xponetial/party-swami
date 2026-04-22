import Link from "next/link";
import { ArrowRight, Handshake, MapPin, Search, Sparkles, Store } from "lucide-react";
import { ShellFrame } from "@/components/layout/shell-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPlanners, getVendors } from "@/lib/marketplace";
import { PLANNER_SERVICES, VENDOR_CATEGORIES } from "@/types/marketplace";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ zip?: string; category?: string; service?: string; radius?: string }>;
}) {
  const filters = await searchParams;
  const radiusMiles = filters.radius ? Number(filters.radius) : 50;
  const [vendors, planners] = await Promise.all([
    getVendors({ zip: filters.zip, category: filters.category, radiusMiles }),
    getPlanners({ zip: filters.zip, service: filters.service, radiusMiles }),
  ]);
  const activeZip = filters.zip?.trim() || "";
  const hasActiveSearch = Boolean(activeZip || filters.category || filters.service);

  return (
    <ShellFrame
      eyebrow="Phase 3 marketplace"
      title="Find party help near your event"
      description="Browse early vendor and professional planner profiles. Payments stay external in Phase 3 while Party Swami tracks introductions and demand."
      contactContext="marketing"
    >
      <div className="grid gap-5">
        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
          <Card className="flex flex-col justify-between gap-6">
            <div>
              <Badge>Local matching MVP</Badge>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-ink">
                From invite sent to help booked
              </h2>
              <p className="mt-3 text-sm leading-6 text-ink-muted">
                Hosts can stay DIY with shopping links, request a quick planner consult, or browse
                vendors for the pieces they do not want to coordinate alone.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {[
                { icon: Store, label: "Vendor leads", value: "Bakeries, DJs, venues" },
                { icon: Handshake, label: "Planner services", value: "Consults and full service" },
                { icon: Sparkles, label: "AI advantage", value: "Recommendations from event context" },
              ].map((item) => (
                <div key={item.label} className="rounded-3xl border border-white/70 bg-white/45 p-4">
                  <item.icon className="size-5 text-brand" />
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-ink-muted">{item.label}</p>
                  <p className="mt-1 font-semibold text-ink">{item.value}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-accent-soft p-3 text-accent">
                <Search className="size-5" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-ink">Search the marketplace</h2>
                <p className="text-sm text-ink-muted">Start with ZIP matching, then refine by provider type.</p>
              </div>
            </div>
            <form className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_0.7fr_auto]" action="/marketplace#marketplace-results" method="get">
              <div className="space-y-2">
                <Label htmlFor="zip">Event ZIP</Label>
                <Input id="zip" name="zip" inputMode="numeric" maxLength={5} placeholder="78701" defaultValue={activeZip} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Vendor category</Label>
                <select
                  id="category"
                  name="category"
                  defaultValue={filters.category ?? ""}
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand/50 focus:ring-4 focus:ring-brand/10"
                >
                  <option value="">All vendor categories</option>
                  {VENDOR_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="radius">Radius</Label>
                <select
                  id="radius"
                  name="radius"
                  defaultValue={String(radiusMiles)}
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand/50 focus:ring-4 focus:ring-brand/10"
                >
                  {[10, 25, 50, 100].map((radius) => (
                    <option key={radius} value={radius}>
                      {radius} mi
                    </option>
                  ))}
                </select>
              </div>
              <Button className="self-end" type="submit">
                Search
                <ArrowRight className="size-4" />
              </Button>
            </form>
            <form className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto]" action="/marketplace#marketplace-results" method="get">
              <input type="hidden" name="zip" value={activeZip} />
              <input type="hidden" name="radius" value={String(radiusMiles)} />
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="service">Planner service</Label>
                <select
                  id="service"
                  name="service"
                  defaultValue={filters.service ?? ""}
                  className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand/50 focus:ring-4 focus:ring-brand/10"
                >
                  <option value="">All planner services</option>
                  {PLANNER_SERVICES.map((service) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
              </div>
              <Button className="self-end" type="submit" variant="secondary">
                Find planners
              </Button>
            </form>
            <div className="mt-5 rounded-[1.75rem] border border-border bg-white/65 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">
                {hasActiveSearch ? "Search results" : "Marketplace inventory"}
              </p>
              <p className="mt-2 text-lg font-semibold text-ink">
                {vendors.length} vendor{vendors.length === 1 ? "" : "s"} and {planners.length} planner{planners.length === 1 ? "" : "s"} found
              </p>
              <p className="mt-1 text-sm leading-6 text-ink-muted">
                {hasActiveSearch
                  ? `Showing matches${activeZip ? ` within ${radiusMiles} miles of ${activeZip}` : ""}${filters.category ? ` in ${filters.category}` : ""}${filters.service ? ` with ${filters.service}` : ""}.`
                  : "Use a seed ZIP like 78701, 78704, 78664, or 75043 to test local matching."}
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {vendors.slice(0, 2).map((vendor) => (
                  <Link
                    key={vendor.id}
                    href={`/vendors/${vendor.slug}`}
                    className="rounded-2xl border border-border bg-canvas/70 px-4 py-3 text-sm font-medium text-ink transition hover:border-brand/35"
                  >
                    {vendor.businessName}
                    <span className="block text-xs font-normal text-ink-muted">
                      {vendor.category} | {vendor.distanceMiles == null ? vendor.zipCode : `${vendor.distanceMiles} mi`}
                    </span>
                  </Link>
                ))}
                {planners.slice(0, 2).map((planner) => (
                  <Link
                    key={planner.id}
                    href={`/planners/${planner.slug}`}
                    className="rounded-2xl border border-border bg-canvas/70 px-4 py-3 text-sm font-medium text-ink transition hover:border-brand/35"
                  >
                    {planner.businessName}
                    <span className="block text-xs font-normal text-ink-muted">
                      Planner | {planner.distanceMiles == null ? planner.zipCode : `${planner.distanceMiles} mi`}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </Card>
        </section>

        <section id="marketplace-results" className="scroll-mt-6 grid gap-5 xl:grid-cols-2">
          <Card>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Badge>Vendors</Badge>
                <h2 className="mt-3 text-2xl font-semibold text-ink">Book direct, track the lead</h2>
              </div>
              <Button asChild variant="secondary">
                <Link href="/vendors/signup">Join as vendor</Link>
              </Button>
            </div>
            <div className="mt-5 grid gap-3">
              {vendors.length ? vendors.map((vendor) => (
                <Link
                  key={vendor.id}
                  href={`/vendors/${vendor.slug}`}
                  className="rounded-3xl border border-border bg-white/70 p-4 transition hover:border-brand/35 hover:bg-white"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{vendor.businessName}</p>
                      <p className="mt-1 text-sm text-ink-muted">{vendor.category}</p>
                    </div>
                    <span className="rounded-full bg-canvas px-3 py-1 text-xs text-ink-muted">
                      {vendor.distanceMiles == null ? `${vendor.city}, ${vendor.state ?? vendor.zipCode}` : `${vendor.distanceMiles} mi`}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink-muted">{vendor.description}</p>
                </Link>
              )) : (
                <p className="rounded-3xl border border-border bg-white/60 p-5 text-sm text-ink-muted">
                  No active vendors match yet. Try a broader search or seed this market with a vendor signup.
                </p>
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Badge>Planners</Badge>
                <h2 className="mt-3 text-2xl font-semibold text-ink">Consults or full service</h2>
              </div>
              <Button asChild variant="secondary">
                <Link href="/planners/signup">Join as planner</Link>
              </Button>
            </div>
            <div className="mt-5 grid gap-3">
              {planners.length ? planners.map((planner) => (
                <Link
                  key={planner.id}
                  href={`/planners/${planner.slug}`}
                  className="rounded-3xl border border-border bg-white/70 p-4 transition hover:border-brand/35 hover:bg-white"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{planner.businessName}</p>
                      <p className="mt-1 text-sm text-ink-muted">{planner.services.slice(0, 2).join(" · ") || "Party planning"}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-3 py-1 text-xs text-ink-muted">
                      <MapPin className="size-3" />
                      {planner.distanceMiles == null ? `${planner.city}, ${planner.state ?? planner.zipCode}` : `${planner.distanceMiles} mi`}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink-muted">{planner.bio}</p>
                </Link>
              )) : (
                <p className="rounded-3xl border border-border bg-white/60 p-5 text-sm text-ink-muted">
                  No active planners match yet. The signup flow is ready for the first supply-side profiles.
                </p>
              )}
            </div>
          </Card>
        </section>
      </div>
    </ShellFrame>
  );
}
