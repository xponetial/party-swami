import Link from "next/link";
import { redirect } from "next/navigation";
import { Handshake } from "lucide-react";
import {
  createProviderPackageAction,
  updatePlannerProfileAction,
  updateProviderLeadStatusAction,
  updateProviderReviewResponseAction,
} from "@/app/marketplace/actions";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  claimPendingPlannerProfilesForOwner,
  getLeadActivity,
  getOwnedPlannerDashboard,
  getOwnedPlannerReviews,
  getPlannerPackages,
} from "@/lib/marketplace";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MARKETPLACE_LEAD_STATUSES, PLANNER_SERVICES } from "@/types/marketplace";

export default async function PlannerDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await claimPendingPlannerProfilesForOwner(user.id, user.email);
  const { profiles, leads } = await getOwnedPlannerDashboard(user.id);
  const [packagesByProfileEntries, activityByLeadId, reviews] = await Promise.all([
    Promise.all(profiles.map(async (profile) => [profile.id, await getPlannerPackages(profile.id)] as const)),
    getLeadActivity(leads.map((lead) => lead.id)),
    getOwnedPlannerReviews(user.id),
  ]);
  const packagesByProfileId = new Map(packagesByProfileEntries);
  const activeProfiles = profiles.filter((profile) => profile.status === "active").length;
  const pendingProfiles = profiles.filter((profile) => profile.status === "pending_review").length;
  const pausedProfiles = profiles.filter((profile) => profile.status === "paused").length;
  const hasOnlyPendingProfiles = pendingProfiles > 0 && activeProfiles === 0 && pausedProfiles === 0;

  return (
    <AppShell
      currentSection="/planners/dashboard"
      title="Planner dashboard"
      description="Review consultation and full-service lead requests. New planner signups stay in review until marketplace admin approval."
      actions={
        hasOnlyPendingProfiles ? (
          <Button type="button" variant="secondary" disabled>
            Pending approval
          </Button>
        ) : (
          <Button asChild><Link href="/planners/signup">{profiles.length ? "Add planner profile" : "Start planner profile"}</Link></Button>
        )
      }
    >
      <div className="grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-accent-soft p-3 text-accent">
              <Handshake className="size-5" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-ink">Profiles</h2>
              <p className="text-sm text-ink-muted">
                {profiles.length} total profile{profiles.length === 1 ? "" : "s"}
                {activeProfiles ? ` | ${activeProfiles} active` : ""}
                {pendingProfiles ? ` | ${pendingProfiles} in review` : ""}
                {pausedProfiles ? ` | ${pausedProfiles} paused` : ""}
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {profiles.length ? profiles.map((profile) => (
              <div key={profile.id} className="rounded-3xl border border-border bg-white/65 p-4">
                <Link href={`/planners/${profile.slug}`} className="block transition hover:text-brand">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold text-ink">{profile.businessName}</p>
                    <span className="rounded-full bg-canvas px-3 py-1 text-xs uppercase tracking-[0.16em] text-ink-muted">
                      {profile.status === "pending_review" ? "in review" : profile.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">{profile.services.slice(0, 2).join(" | ") || "Planning"} | {profile.city}, {profile.state ?? profile.zipCode}</p>
                </Link>
                {profile.status === "pending_review" ? (
                  <p className="mt-3 rounded-2xl bg-canvas px-4 py-3 text-sm text-ink-muted">
                    Your planner profile has been submitted and is waiting for approval from marketplace admin. It will appear publicly after review.
                  </p>
                ) : null}
                {profile.status === "paused" ? (
                  <p className="mt-3 rounded-2xl bg-canvas px-4 py-3 text-sm text-ink-muted">
                    This planner profile is paused and hidden from marketplace search until it is reactivated.
                  </p>
                ) : null}
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-ink">Edit profile</summary>
                  <form action={updatePlannerProfileAction} className="mt-4 grid gap-3">
                    <input type="hidden" name="providerId" value={profile.id} />
                    <input type="hidden" name="returnTo" value="/planners/dashboard" />
                    <Input name="businessName" defaultValue={profile.businessName} required />
                    <Input name="contactName" defaultValue={profile.contactName} required />
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Input name="city" defaultValue={profile.city} required />
                      <Input name="state" defaultValue={profile.state ?? ""} />
                      <Input name="zipCode" defaultValue={profile.zipCode} required maxLength={5} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Input name="serviceRadiusMiles" defaultValue={profile.serviceRadiusMiles} required type="number" min="1" max="250" />
                      <Input name="responseTimeHours" defaultValue={profile.responseTimeHours} required type="number" min="1" max="240" />
                      <Input name="yearsExperience" defaultValue={profile.yearsExperience ?? ""} type="number" min="0" />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input name="contactEmail" defaultValue={profile.contactEmail} required type="email" />
                      <Input name="contactPhone" defaultValue={profile.contactPhone ?? ""} />
                      <Input name="websiteUrl" defaultValue={profile.websiteUrl ?? ""} type="url" />
                      <Input name="consultationPrice" defaultValue={profile.consultationPrice ?? ""} type="number" min="0" step="0.01" />
                      <Input name="hourlyRate" defaultValue={profile.hourlyRate ?? ""} type="number" min="0" step="0.01" />
                      <Input name="fullServiceMinimum" defaultValue={profile.fullServiceMinimum ?? ""} type="number" min="0" step="0.01" />
                    </div>
                    <div className="grid gap-2 rounded-2xl bg-canvas p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-ink-muted">Services</p>
                      {PLANNER_SERVICES.map((service) => (
                        <label key={service} className="flex items-center gap-2 text-sm text-ink-muted">
                          <input type="checkbox" name="services" value={service} defaultChecked={profile.services.includes(service)} />
                          {service}
                        </label>
                      ))}
                    </div>
                    <textarea name="bio" defaultValue={profile.bio} required rows={4} className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none" />
                    <textarea name="certifications" defaultValue={profile.certifications ?? ""} rows={3} className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none" placeholder="Certifications or specialties" />
                    <textarea name="availabilityNote" defaultValue={profile.availabilityNote ?? ""} rows={2} className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none" placeholder="Availability note" />
                    <textarea name="serviceNotes" defaultValue={profile.serviceNotes ?? ""} rows={3} className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none" placeholder="Service notes, constraints, planning style" />
                    <Button type="submit" variant="secondary">Save profile</Button>
                  </form>
                </details>
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-ink">Packages ({packagesByProfileId.get(profile.id)?.length ?? 0})</summary>
                  <div className="mt-3 grid gap-2">
                    {(packagesByProfileId.get(profile.id) ?? []).map((item) => (
                      <div key={item.id} className="rounded-2xl bg-canvas px-4 py-3 text-sm text-ink-muted">
                        <span className="font-semibold text-ink">{item.title}</span> | {item.priceLabel ?? (item.price == null ? "Custom quote" : `$${item.price}`)}
                      </div>
                    ))}
                  </div>
                  <form action={createProviderPackageAction} className="mt-3 grid gap-3 rounded-2xl bg-canvas p-3">
                    <input type="hidden" name="providerType" value="planner" />
                    <input type="hidden" name="providerId" value={profile.id} />
                    <input type="hidden" name="returnTo" value="/planners/dashboard" />
                    <Input name="title" placeholder="Package title" required />
                    <Input name="price" placeholder="Price" type="number" min="0" step="0.01" />
                    <Input name="priceLabel" placeholder="Price label, e.g. custom quote" />
                    <textarea name="description" required rows={3} className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none" placeholder="What this package includes" />
                    <Button type="submit" variant="secondary">Add package</Button>
                  </form>
                </details>
              </div>
            )) : (
              <p className="rounded-3xl border border-border bg-white/60 p-5 text-sm text-ink-muted">
                No planner application yet. Submit a planner profile to start the review process.
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
                  {lead.packageTitle ? ` | ${lead.packageTitle}` : ""}
                </p>
                {(activityByLeadId.get(lead.id) ?? []).length ? (
                  <div className="mt-4 rounded-2xl bg-canvas p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-ink-muted">History</p>
                    <div className="mt-2 grid gap-2">
                      {(activityByLeadId.get(lead.id) ?? []).slice(0, 3).map((activity) => (
                        <p key={activity.id} className="text-sm text-ink-muted">
                          {activity.action.replaceAll("_", " ")}
                          {activity.toStatus ? ` -> ${activity.toStatus}` : ""}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}
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
                {hasOnlyPendingProfiles
                  ? "Your planner profile is in review. Client requests will show up after approval."
                  : "No client requests yet. Your public planner profile is the top of this funnel."}
              </p>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-2xl font-semibold text-ink">Review responses</h2>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Respond to host reviews. Responses show publicly once the review is approved.
        </p>
        <div className="mt-5 grid gap-3">
          {reviews.length ? reviews.map((review) => (
            <div key={review.id} className="rounded-3xl border border-border bg-white/65 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{review.rating}/5 - {review.title}</p>
                  <p className="mt-1 text-sm text-ink-muted">{review.status}</p>
                </div>
                {review.providerRespondedAt ? (
                  <span className="rounded-full bg-canvas px-3 py-1 text-xs uppercase tracking-[0.16em] text-ink-muted">responded</span>
                ) : null}
              </div>
              <p className="mt-3 text-sm leading-6 text-ink-muted">{review.body}</p>
              <form action={updateProviderReviewResponseAction} className="mt-4 grid gap-3 rounded-2xl bg-canvas p-3">
                <input type="hidden" name="reviewId" value={review.id} />
                <input type="hidden" name="providerType" value="planner" />
                <input type="hidden" name="returnTo" value="/planners/dashboard" />
                <textarea
                  className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none"
                  defaultValue={review.providerResponse ?? ""}
                  name="providerResponse"
                  placeholder="Write a professional public response"
                  required
                  rows={3}
                />
                <Button type="submit" variant="secondary">Save response</Button>
              </form>
            </div>
          )) : (
            <p className="rounded-3xl border border-border bg-white/60 p-5 text-sm text-ink-muted">
              No reviews yet.
            </p>
          )}
        </div>
      </Card>
    </AppShell>
  );
}
