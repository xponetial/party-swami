import Image from "next/image";
import { updateTemplateControlAction } from "@/app/admin/actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { SubmitButton } from "@/components/ui/submit-button";
import { getAdminTemplateMetrics, requireAdminAccess } from "@/lib/admin";

export default async function AdminTemplatesPage() {
  const [{ profile }, categories] = await Promise.all([
    requireAdminAccess(),
    getAdminTemplateMetrics(),
  ]);
  const templateCount = categories.reduce((sum, category) => sum + category.templates.length, 0);
  const inactiveCount = categories.reduce(
    (sum, category) => sum + category.templates.filter((template) => !template.isActive).length,
    0,
  );

  return (
    <AdminShell
      currentSection="/admin/templates"
      title="Template manager"
      description="See which invite categories and individual designs are carrying the most host usage, plus control which templates stay live."
      adminName={profile?.full_name}
    >
      <div className="grid gap-4 xl:grid-cols-3">
        {[
          { label: "Template categories", value: String(categories.length) },
          { label: "Live templates", value: String(templateCount - inactiveCount) },
          { label: "Inactive templates", value: String(inactiveCount) },
        ].map((item) => (
          <div key={item.label} className="rounded-[2rem] border border-white/75 bg-canvas p-6 shadow-party">
            <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">{item.value}</p>
          </div>
        ))}
      </div>

      <DashboardPanel
        title="Category usage"
        description="Preview the actual designs, measure usage, and activate or deactivate templates from the admin workspace."
      >
        <div className="space-y-4">
          {categories.map((category) => (
            <div key={category.categoryKey} className="rounded-3xl border border-border bg-white/70 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-semibold text-ink">{category.categoryLabel}</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {category.templates.length} template{category.templates.length === 1 ? "" : "s"} in catalog
                  </p>
                </div>
                <span className="rounded-full bg-canvas px-4 py-2 text-sm font-semibold text-ink">
                  {category.totalUsage} selections
                </span>
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                {category.templates.map((template) => (
                  <div key={`${template.packSlug}:${template.templateId}`} className="rounded-2xl bg-canvas p-4">
                    <div className="grid gap-4 sm:grid-cols-[168px_1fr]">
                      <div className="overflow-hidden rounded-2xl border border-border bg-white/70">
                        <div className="relative aspect-[3/4] w-full">
                          <Image
                            alt={`${template.style} preview`}
                            className="object-cover"
                            fill
                            sizes="168px"
                            src={template.assetPath}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold text-ink">{template.style}</p>
                            <p className="mt-1 text-sm text-ink-muted">{template.packSlug}</p>
                          </div>
                          <div className="text-right text-sm text-ink-muted">
                            <p>{template.usageCount} used</p>
                            <p className="mt-1">{template.sentCount} sent</p>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-white px-3 py-1 text-xs uppercase tracking-[0.18em] text-ink-muted">
                            {template.templateId}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em] ${
                              template.isActive ? "bg-accent-soft text-accent" : "bg-brand/10 text-brand"
                            }`}
                          >
                            {template.isActive ? "active" : "inactive"}
                          </span>
                        </div>

                        {template.notes ? (
                          <p className="mt-3 text-sm text-ink-muted">{template.notes}</p>
                        ) : null}

                        <form action={updateTemplateControlAction} className="mt-4 flex flex-wrap gap-2">
                          <input name="packSlug" type="hidden" value={template.packSlug} />
                          <input name="templateId" type="hidden" value={template.templateId} />
                          <input name="isActive" type="hidden" value={template.isActive ? "false" : "true"} />
                          <SubmitButton
                            pendingLabel={template.isActive ? "Deactivating..." : "Activating..."}
                            variant={template.isActive ? "ghost" : "secondary"}
                          >
                            {template.isActive ? "Deactivate template" : "Activate template"}
                          </SubmitButton>
                        </form>

                        {!template.isActive ? (
                          <p className="mt-3 text-sm text-ink-muted">
                            This template is hidden from host-facing template pickers until it is reactivated.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DashboardPanel>
    </AdminShell>
  );
}
