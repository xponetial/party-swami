import Link from "next/link";
import { redirect } from "next/navigation";
import { Store } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOwnedVendorDashboard } from "@/lib/marketplace";

export default async function VendorDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { profiles, leads } = await getOwnedVendorDashboard(user.id);

  return (
    <AppShell
      currentSection="/marketplace"
      title="Vendor dashboard"
      description="Manage storefront visibility and review tracked lead requests. Payments and fulfillment stay external for Phase 3."
      actions={<Button asChild><Link href="/vendors/signup">New storefront</Link></Button>}
    >
      <div className="grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-accent-soft p-3 text-accent">
              <Store className="size-5" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-ink">Storefronts</h2>
              <p className="text-sm text-ink-muted">{profiles.length} active profile{profiles.length === 1 ? "" : "s"}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {profiles.length ? profiles.map((profile) => (
              <Link key={profile.id} href={`/vendors/${profile.slug}`} className="rounded-3xl border border-border bg-white/65 p-4 transition hover:border-brand/35">
                <p className="font-semibold text-ink">{profile.businessName}</p>
                <p className="mt-1 text-sm text-ink-muted">{profile.category} · {profile.city}, {profile.state ?? profile.zipCode}</p>
              </Link>
            )) : (
              <p className="rounded-3xl border border-border bg-white/60 p-5 text-sm text-ink-muted">
                No vendor storefront yet. Create one to start receiving marketplace leads.
              </p>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-2xl font-semibold text-ink">Lead requests</h2>
          <div className="mt-5 grid gap-3">
            {leads.length ? leads.map((lead) => (
              <div key={lead.id} className="rounded-3xl border border-border bg-white/65 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{lead.contactName}</p>
                    <p className="mt-1 text-sm text-ink-muted">{lead.contactEmail}{lead.contactPhone ? ` · ${lead.contactPhone}` : ""}</p>
                  </div>
                  <span className="rounded-full bg-canvas px-3 py-1 text-xs uppercase tracking-[0.16em] text-ink-muted">{lead.status}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-ink-muted">{lead.message}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-ink-muted">
                  {lead.eventType ?? "Event"} · {lead.eventZipCode ?? "ZIP TBD"} · {lead.budget ? `$${lead.budget}` : "Budget TBD"}
                </p>
              </div>
            )) : (
              <p className="rounded-3xl border border-border bg-white/60 p-5 text-sm text-ink-muted">
                No leads yet. Share your storefront or wait for marketplace discovery.
              </p>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
