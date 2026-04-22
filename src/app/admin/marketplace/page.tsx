import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import {
  updateAdminMarketplaceLeadStatusAction,
  updateAdminMarketplaceProviderStatusAction,
  updateAdminMarketplaceReviewStatusAction,
} from "@/app/admin/actions";
import {
  formatAdminCurrency,
  formatAdminDateTime,
  getAdminMarketplaceData,
  normalizeAdminRange,
  requireAdminAccess,
} from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { MARKETPLACE_LEAD_STATUSES, MARKETPLACE_PROVIDER_STATUSES } from "@/types/marketplace";

const rangeOptions = [
  { label: "7 days", value: "7" },
  { label: "30 days", value: "30" },
  { label: "90 days", value: "90" },
] as const;

export default async function AdminMarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; status?: string; providerType?: string; q?: string }>;
}) {
  const resolved = await searchParams;
  const rangeDays = normalizeAdminRange(resolved.range);
  const [{ profile }, marketplace] = await Promise.all([
    requireAdminAccess(),
    getAdminMarketplaceData(rangeDays, {
      status: resolved.status,
      providerType: resolved.providerType,
      query: resolved.q,
    }),
  ]);
  const currentPath = `/admin/marketplace?${new URLSearchParams(
    Object.entries({
      range: resolved.range,
      status: resolved.status,
      providerType: resolved.providerType,
      q: resolved.q,
    }).filter((entry): entry is [string, string] => Boolean(entry[1])),
  ).toString()}`;

  return (
    <AdminShell
      currentSection="/admin/marketplace"
      title="Marketplace and shopping"
      description="A clearer view of retailer-intent behavior, recommendation engagement, and shopping category demand."
      adminName={profile?.full_name}
      actions={
        <div className="flex flex-wrap gap-2">
          {rangeOptions.map((option) => (
            <Button
              key={option.value}
              asChild
              variant={rangeDays === Number(option.value) ? "primary" : "secondary"}
            >
              <Link href={option.value === "30" ? "/admin/marketplace" : `/admin/marketplace?range=${option.value}`}>
                {option.label}
              </Link>
            </Button>
          ))}
        </div>
      }
    >
      <div className="grid gap-4 xl:grid-cols-3">
        {[
          { label: "Marketplace leads", value: String(marketplace.totalLeads) },
          { label: "New leads", value: String(marketplace.newLeads) },
          { label: "Vendor / planner", value: `${marketplace.vendorLeads} / ${marketplace.plannerLeads}` },
          { label: "Notifications", value: marketplace.notificationCounts.map((item) => `${item.label}: ${item.count}`).join(" / ") || "0" },
          { label: "Shopping clicks", value: String(marketplace.totalClicks) },
          { label: "Replacement actions", value: String(marketplace.totalReplacementActions) },
          { label: "Reviews", value: String(marketplace.reviews.length) },
        ].map((item) => (
          <div key={item.label} className="rounded-[2rem] border border-white/75 bg-canvas p-6 shadow-party">
            <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">{item.value}</p>
          </div>
        ))}
      </div>

      <DashboardPanel
        title="Marketplace leads"
        description="All vendor and planner requests submitted through Phase 3 marketplace profiles."
      >
        <form className="mb-5 grid gap-3 rounded-3xl bg-canvas p-4 xl:grid-cols-[1.1fr_0.55fr_0.7fr_auto]">
          <input type="hidden" name="range" value={resolved.range ?? "30"} />
          <input
            className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none"
            defaultValue={resolved.q ?? ""}
            name="q"
            placeholder="Search provider, contact, email, ZIP, message"
            type="search"
          />
          <select
            className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none"
            defaultValue={resolved.status ?? "all"}
            name="status"
          >
            <option value="all">All statuses</option>
            {MARKETPLACE_LEAD_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none"
            defaultValue={resolved.providerType ?? "all"}
            name="providerType"
          >
            <option value="all">All providers</option>
            <option value="vendor">Vendors</option>
            <option value="planner">Planners</option>
          </select>
          <button className="rounded-full bg-[linear-gradient(135deg,#ff7bd5_0%,#a54dff_36%,#2f8fff_100%)] px-5 py-3 text-sm font-medium text-white shadow-[0_14px_30px_rgba(101,85,176,0.12)]" type="submit">
            Filter leads
          </button>
        </form>
        <div className="space-y-3">
          {marketplace.recentLeads.length ? marketplace.recentLeads.map((lead) => (
            <div key={lead.id} className="rounded-3xl border border-border bg-white/70 p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold text-ink">{lead.providerName}</p>
                    <span className="rounded-full bg-canvas px-3 py-1 text-xs uppercase tracking-[0.16em] text-ink-muted">
                      {lead.providerType}
                    </span>
                  <span className="rounded-full bg-canvas px-3 py-1 text-xs uppercase tracking-[0.16em] text-ink-muted">
                    {lead.status}
                  </span>
                  </div>
                  <p className="mt-2 text-sm text-ink-muted">
                    {lead.contactName} | {lead.contactEmail}
                    {lead.contactPhone ? ` | ${lead.contactPhone}` : ""}
                  </p>
                </div>
                <div className="text-left text-sm text-ink-muted xl:text-right">
                  <p>{formatAdminDateTime(lead.createdAt)}</p>
                  <p className="mt-1">{lead.eventZipCode ?? "ZIP TBD"}</p>
                </div>
              </div>

              <p className="mt-4 rounded-2xl bg-canvas px-4 py-3 text-sm leading-6 text-ink-muted">
                {lead.message}
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Lead type", value: lead.leadType.replaceAll("_", " ") },
                  { label: "Event", value: lead.eventTitle ?? lead.eventType ?? "Event TBD" },
                  { label: "Budget", value: lead.budget == null ? "Budget TBD" : formatAdminCurrency(lead.budget) },
                  { label: "Lead ID", value: lead.id.slice(0, 8) },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl bg-canvas px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold capitalize text-ink">{item.value}</p>
                  </div>
                ))}
              </div>
              <form action={updateAdminMarketplaceLeadStatusAction} className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl bg-canvas p-3">
                <input type="hidden" name="leadId" value={lead.id} />
                <input type="hidden" name="returnTo" value={currentPath} />
                <label className="grid gap-2 text-xs uppercase tracking-[0.16em] text-ink-muted">
                  Status
                  <select
                    className="min-w-44 rounded-2xl border border-border bg-white px-4 py-3 text-sm normal-case tracking-normal text-ink outline-none"
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
                <Button type="submit" variant="secondary">Update lead</Button>
              </form>
            </div>
          )) : (
            <p className="rounded-3xl border border-border bg-white/70 p-5 text-sm text-ink-muted">
              No marketplace leads in this date range yet.
            </p>
          )}
        </div>
      </DashboardPanel>

      <DashboardPanel
        title="Provider moderation"
        description="Review public marketplace supply, pause listings, and mark trusted providers as verified."
      >
        <div className="space-y-3">
          {marketplace.providers.map((provider) => (
            <div key={`${provider.providerType}-${provider.id}`} className="rounded-3xl border border-border bg-white/70 p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-lg font-semibold text-ink">{provider.name}</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {provider.providerType} | {provider.categoryOrServices} | {provider.city}, {provider.state ?? provider.zipCode}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-canvas px-3 py-1 text-xs uppercase tracking-[0.16em] text-ink-muted">{provider.status}</span>
                  {provider.isVerified ? (
                    <span className="rounded-full bg-canvas px-3 py-1 text-xs uppercase tracking-[0.16em] text-ink-muted">verified</span>
                  ) : null}
                  <span className="rounded-full bg-canvas px-3 py-1 text-xs uppercase tracking-[0.16em] text-ink-muted">{provider.leadCount} leads</span>
                </div>
              </div>
              <form action={updateAdminMarketplaceProviderStatusAction} className="mt-4 grid gap-3 rounded-2xl bg-canvas p-3 sm:grid-cols-[1fr_1fr_auto]">
                <input type="hidden" name="providerId" value={provider.id} />
                <input type="hidden" name="providerType" value={provider.providerType} />
                <input type="hidden" name="returnTo" value={currentPath} />
                <label className="grid gap-2 text-xs uppercase tracking-[0.16em] text-ink-muted">
                  Status
                  <select
                    className="rounded-2xl border border-border bg-white px-4 py-3 text-sm normal-case tracking-normal text-ink outline-none"
                    defaultValue={provider.status}
                    name="status"
                  >
                    {MARKETPLACE_PROVIDER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-xs uppercase tracking-[0.16em] text-ink-muted">
                  Verification
                  <select
                    className="rounded-2xl border border-border bg-white px-4 py-3 text-sm normal-case tracking-normal text-ink outline-none"
                    defaultValue={provider.isVerified ? "true" : "false"}
                    name="isVerified"
                  >
                    <option value="false">Not verified</option>
                    <option value="true">Verified</option>
                  </select>
                </label>
                <Button className="self-end" type="submit" variant="secondary">Save provider</Button>
              </form>
            </div>
          ))}
        </div>
      </DashboardPanel>

      <DashboardPanel
        title="Review moderation"
        description="Approve or reject host reviews before they appear on public marketplace profiles."
      >
        <div className="space-y-3">
          {marketplace.reviews.length ? marketplace.reviews.map((review) => (
            <div key={review.id} className="rounded-3xl border border-border bg-white/70 p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-lg font-semibold text-ink">{review.title}</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {review.providerName} | {review.providerType} | {review.rating}/5 | {review.status}
                  </p>
                </div>
                <p className="text-sm text-ink-muted">{formatAdminDateTime(review.createdAt)}</p>
              </div>
              <p className="mt-4 rounded-2xl bg-canvas px-4 py-3 text-sm leading-6 text-ink-muted">{review.body}</p>
              {review.providerResponse ? (
                <div className="mt-4 rounded-2xl bg-canvas px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-ink-muted">Provider response</p>
                  <p className="mt-2 text-sm leading-6 text-ink-muted">{review.providerResponse}</p>
                </div>
              ) : null}
              <form action={updateAdminMarketplaceReviewStatusAction} className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl bg-canvas p-3">
                <input type="hidden" name="reviewId" value={review.id} />
                <input type="hidden" name="returnTo" value={currentPath} />
                <label className="grid gap-2 text-xs uppercase tracking-[0.16em] text-ink-muted">
                  Status
                  <select
                    className="min-w-44 rounded-2xl border border-border bg-white px-4 py-3 text-sm normal-case tracking-normal text-ink outline-none"
                    defaultValue={review.status}
                    name="status"
                  >
                    <option value="pending_review">pending_review</option>
                    <option value="approved">approved</option>
                    <option value="rejected">rejected</option>
                  </select>
                </label>
                <Button type="submit" variant="secondary">Save review</Button>
              </form>
            </div>
          )) : (
            <p className="rounded-3xl border border-border bg-white/70 p-5 text-sm text-ink-muted">
              No marketplace reviews yet.
            </p>
          )}
        </div>
      </DashboardPanel>

      <div className="grid gap-4 xl:grid-cols-3">
        <DashboardPanel
          title="Top event types"
          description="The event types currently driving the most retailer-intent behavior."
        >
          <div className="space-y-3">
            {marketplace.topEventTypes.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-2xl bg-canvas px-4 py-3">
                <p className="font-medium text-ink">{item.label}</p>
                <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-ink">{item.count}</span>
              </div>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Top shopping categories"
          description="The categories hosts are most often receiving in their shopping lists."
        >
          <div className="space-y-3">
            {marketplace.topShoppingCategories.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-2xl bg-canvas px-4 py-3">
                <p className="font-medium text-ink">{item.label}</p>
                <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-ink">{item.count}</span>
              </div>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Top clicked events"
          description="The live events with the most retailer click-through behavior."
        >
          <div className="space-y-3">
            {marketplace.topClickedEvents.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-2xl bg-canvas px-4 py-3">
                <p className="font-medium text-ink">{item.label}</p>
                <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-ink">{item.count}</span>
              </div>
            ))}
          </div>
        </DashboardPanel>
      </div>
    </AdminShell>
  );
}
