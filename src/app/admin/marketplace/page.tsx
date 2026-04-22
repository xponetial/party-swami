import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import {
  formatAdminCurrency,
  formatAdminDateTime,
  getAdminMarketplaceData,
  normalizeAdminRange,
  requireAdminAccess,
} from "@/lib/admin";
import { Button } from "@/components/ui/button";

const rangeOptions = [
  { label: "7 days", value: "7" },
  { label: "30 days", value: "30" },
  { label: "90 days", value: "90" },
] as const;

export default async function AdminMarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const resolved = await searchParams;
  const rangeDays = normalizeAdminRange(resolved.range);
  const [{ profile }, marketplace] = await Promise.all([
    requireAdminAccess(),
    getAdminMarketplaceData(rangeDays),
  ]);

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
          { label: "Shopping clicks", value: String(marketplace.totalClicks) },
          { label: "Replacement actions", value: String(marketplace.totalReplacementActions) },
          { label: "Top categories", value: String(marketplace.topShoppingCategories.length) },
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
            </div>
          )) : (
            <p className="rounded-3xl border border-border bg-white/70 p-5 text-sm text-ink-muted">
              No marketplace leads in this date range yet.
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
