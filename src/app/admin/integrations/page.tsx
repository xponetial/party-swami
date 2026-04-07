import { AdminShell } from "@/components/admin/admin-shell";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { getAdminIntegrationStatus, requireAdminAccess } from "@/lib/admin";

export default async function AdminIntegrationsPage() {
  const [{ profile }, integrations] = await Promise.all([
    requireAdminAccess(),
    getAdminIntegrationStatus(),
  ]);

  return (
    <AdminShell
      currentSection="/admin/integrations"
      title="Integrations and health"
      description="A simple internal health board for the external systems Party Swami depends on."
      adminName={profile?.full_name}
    >
      <DashboardPanel
        title="Service status"
        description="This first pass keeps the integration view focused on configured state and production-readiness cues."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {integrations.services.map((service) => (
            <div key={service.key} className="rounded-3xl border border-border bg-white/70 p-5">
              <div className="flex items-center justify-between gap-4">
                <p className="text-lg font-semibold text-ink">{service.label}</p>
                <span
                  className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] ${
                    service.status === "healthy"
                      ? "bg-accent-soft text-accent"
                      : service.status === "partial"
                        ? "bg-canvas text-ink"
                        : "bg-brand/10 text-brand"
                  }`}
                >
                  {service.status}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-ink-muted">{service.detail}</p>
            </div>
          ))}
        </div>
      </DashboardPanel>
    </AdminShell>
  );
}
