import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { removeSavedVendorForEventAction, saveVendorForEventAction } from "@/app/marketplace/actions";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { allocateBudget, matchVendorsForEvent, type VendorMatch } from "@/lib/ai/brain";
import { getEventContext } from "@/lib/events";
import { getVendorsByIds } from "@/lib/marketplace";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function formatMoney(value: number | null | undefined) {
  if (value == null) return "Custom quote";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

async function ensureVendorMatches({
  supabase,
  eventId,
  event,
  existingMatches,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  eventId: string;
  event: {
    event_type: string;
    budget: number | null;
    guest_target: number | null;
    location: string | null;
  };
  existingMatches: VendorMatch[];
}) {
  if (existingMatches.length > 0) {
    return { matches: existingMatches, requiredCategories: [] as string[] };
  }

  const budget = allocateBudget({
    event_type: event.event_type,
    budget: event.budget,
    guest_target: event.guest_target,
    location: event.location,
  });
  const vendorResult = await matchVendorsForEvent(supabase, event, budget);
  await supabase
    .from("party_plans")
    .update({
      vendor_matches: vendorResult.matches,
      required_vendor_categories: vendorResult.requiredCategories,
    })
    .eq("event_id", eventId);

  return {
    matches: vendorResult.matches,
    requiredCategories: vendorResult.requiredCategories,
  };
}

export default async function EventVendorsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { event, plan } = await getEventContext(eventId);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const initialMatches = (plan?.vendor_matches ?? []) as VendorMatch[];
  const ensured = await ensureVendorMatches({
    supabase,
    eventId,
    event: {
      event_type: event.event_type,
      budget: event.budget,
      guest_target: event.guest_target,
      location: event.location,
    },
    existingMatches: initialMatches,
  });
  const matches = ensured.matches;
  const requiredCategories =
    plan?.required_vendor_categories?.length
      ? plan.required_vendor_categories
      : ensured.requiredCategories;

  const vendorProfiles = await getVendorsByIds(matches.map((match) => match.vendor_id));
  const vendorById = new Map(vendorProfiles.map((vendor) => [vendor.id, vendor] as const));
  const savedRows = user
    ? (
        await supabase
          .from("marketplace_saved_vendors")
          .select("vendor_id")
          .eq("user_id", user.id)
          .eq("event_id", eventId)
          .returns<Array<{ vendor_id: string }>>()
      ).data ?? []
    : [];
  const savedVendorIds = new Set(savedRows.map((row) => row.vendor_id));
  const compareMatches = matches.slice(0, 3);

  return (
    <AppShell
      title="Recommended Vendors For Your Event"
      description="AI-ranked vendor matches based on your event context, budget, and requested services."
      backHref={`/events/${eventId}/shopping`}
      backLabel="Back to shopping"
      eventNav={{ eventId, eventTitle: event.title, active: "vendors" }}
    >
      <Card className="bg-white/80">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge>Phase 14 MVP</Badge>
            <h2 className="mt-3 text-xl font-semibold text-ink">Vendor recommendation layer</h2>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              These recommendations are prioritized by match score and can be used to request quotes directly from vendor profiles.
            </p>
          </div>
          <Sparkles className="size-6 shrink-0 text-brand" />
        </div>
      </Card>

      {requiredCategories.length ? (
        <Card>
          <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Vendor categories</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {requiredCategories.map((category) => (
              <Badge key={category}>{category}</Badge>
            ))}
          </div>
        </Card>
      ) : null}

      {matches.length ? (
        <>
          {compareMatches.length >= 2 ? (
            <Card>
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Quick compare</p>
              <h3 className="mt-2 text-lg font-semibold text-ink">Top vendor options side-by-side</h3>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-ink-muted">
                      <th className="py-2 pr-4 font-medium">Vendor</th>
                      <th className="py-2 pr-4 font-medium">Category</th>
                      <th className="py-2 pr-4 font-medium">Match Score</th>
                      <th className="py-2 pr-4 font-medium">Starting Price</th>
                      <th className="py-2 pr-4 font-medium">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compareMatches.map((match) => (
                      <tr key={`compare-${match.vendor_id}`} className="border-b border-border/70">
                        <td className="py-3 pr-4 font-semibold text-ink">{match.business_name}</td>
                        <td className="py-3 pr-4 text-ink-muted">{match.category}</td>
                        <td className="py-3 pr-4 text-ink-muted">{match.score}</td>
                        <td className="py-3 pr-4 text-ink-muted">{formatMoney(match.starting_price)}</td>
                        <td className="py-3 pr-4 text-ink-muted">{match.location ?? "Profile"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {matches.map((match) => {
              const vendor = vendorById.get(match.vendor_id);
              const vendorLink = vendor ? `/vendors/${vendor.slug}?eventId=${eventId}` : null;
              const isSaved = savedVendorIds.has(match.vendor_id);

              return (
                <Card key={match.vendor_id} className="flex flex-col">
                  <div className="flex items-center justify-between gap-3">
                    <Badge>{match.category}</Badge>
                    <span className="rounded-full bg-canvas px-3 py-1 text-xs font-semibold text-ink">
                      Match {match.score}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-ink">{match.business_name}</h3>
                  <p className="mt-1 text-sm text-ink-muted">{match.location ?? "Location available on profile"}</p>
                  <p className="mt-1 text-sm text-ink-muted">Starting at {formatMoney(match.starting_price)}</p>
                  {match.rationale ? (
                    <p className="mt-3 text-xs leading-5 text-ink-muted">
                      Rating fit {Math.round(match.rationale.rating * 100)} · Price fit {Math.round(match.rationale.price_fit * 100)} · Availability {Math.round(match.rationale.availability * 100)}
                    </p>
                  ) : null}
                  <div className="mt-4 flex items-center justify-between gap-2">
                    {match.recommended ? <Badge>Recommended</Badge> : <span />}
                    <div className="flex items-center gap-2">
                      <form action={isSaved ? removeSavedVendorForEventAction : saveVendorForEventAction}>
                        <input type="hidden" name="vendorId" value={match.vendor_id} />
                        <input type="hidden" name="eventId" value={eventId} />
                        <input type="hidden" name="returnTo" value={`/events/${eventId}/vendors`} />
                        <Button type="submit" variant={isSaved ? "secondary" : "ghost"}>
                          {isSaved ? "Saved" : "Save Vendor"}
                        </Button>
                      </form>
                      {vendorLink ? (
                        <Button asChild>
                          <Link href={vendorLink}>
                            View profile
                            <ArrowUpRight className="size-4" />
                          </Link>
                        </Button>
                      ) : (
                        <Button asChild variant="secondary">
                          <Link href="/marketplace">Browse marketplace</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </section>
        </>
      ) : (
        <Card className="bg-white/80">
          <p className="text-sm text-ink-muted">
            No vendor recommendations yet. Generate or refresh your plan first, then return here to review recommended vendors.
          </p>
        </Card>
      )}
    </AppShell>
  );
}
