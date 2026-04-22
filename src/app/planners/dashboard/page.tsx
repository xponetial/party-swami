import Link from "next/link";
import { redirect } from "next/navigation";
import { Handshake } from "lucide-react";
import { updateProviderLeadStatusAction } from "@/app/marketplace/actions";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getOwnedPlannerDashboard } from "@/lib/marketplace";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MARKETPLACE_LEAD_STATUSES } from "@/types/marketplace";

export default async function PlannerDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { profiles, leads } = await getOwnedPlannerDashboard(user.id);

  return (
    <AppShell
      currentSection="/marketplace"
      title="Planner dashboard"
      description="Review consultation and full-service lead requests. Phase 3 keeps payment handling external while demand is validated."
      actions={<Button asChild><Link href="/planners/signup">New planner profile</Link></Button>}
    >
      <div className="grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-accent-soft p-3 text-accent">
              <Handshake className="size-5" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-ink">Profiles</h2>
              <p className="text-sm text-ink-muted">{profiles.length} active profile{profiles.length === 1 ? "" : "s"}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {profiles.length ? profiles.map((profile) => (
              <Link key={profile.id} href={`/planners/${profile.slug}`} className="rounded-3xl border border-border bg-white/65 p-4 transition hover:border-brand/35">
                <p className="font-semibold text-ink">{profile.businessName}</p>
                <p className="mt-1 text-sm text-ink-muted">{profile.services.slice(0, 2).join(" | ") || "Planning"} | {profile.city}, {profile.state ?? profile.zipCode}</p>
              </Link>
            )) : (
              <p className="rounded-3xl border border-border bg-white/60 p-5 text-sm text-ink-muted">
                No planner profile yet. Create one to receive consultation and full-service requests.
              </p>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-2xl font-semibold text-ink">Client requests</h2>
          <div className="mt-5 grid gap-3">
            {leads.length ? leads.map((lead) => (
              <div key={lead.id} className="rounded-3xl border border-border bg-white/65 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{lead.contactName}</p>
                    <p className="mt-1 text-sm text-ink-muted">{lead.contactEmail}{lead.contactPhone ? ` | ${lead.contactPhone}` : ""}</p>
                  </div>
                  <span className="rounded-full bg-canvas px-3 py-1 text-xs uppercase tracking-[0.16em] text-ink-muted">
                    {lead.leadType === "planner_full_service" ? "Full service" : "Consult"} | {lead.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-ink-muted">{lead.message}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-ink-muted">
                  {lead.eventType ?? "Event"} | {lead.eventZipCode ?? "ZIP TBD"} | {lead.budget ? `$${lead.budget}` : "Budget TBD"}
                </p>
                <form action={updateProviderLeadStatusAction} className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl bg-canvas p-3">
                  <input type="hidden" name="leadId" value={lead.id} />
                  <input type="hidden" name="providerType" value="planner" />
                  <input type="hidden" name="returnTo" value="/planners/dashboard" />
                  <label className="grid gap-2 text-xs uppercase tracking-[0.16em] text-ink-muted">
                    Status
                    <select
                      className="min-w-40 rounded-2xl border border-border bg-white px-4 py-3 text-sm normal-case tracking-normal text-ink outline-none"
                      defaultValue={lead.status}
                      name="status"
                    >
                      {MARKETPLACE_LEAD_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Button type="submit" variant="secondary">Update</Button>
                </form>
              </div>
            )) : (
              <p className="rounded-3xl border border-border bg-white/60 p-5 text-sm text-ink-muted">
                No client requests yet. Your public planner profile is the top of this funnel.
              </p>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
