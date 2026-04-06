import Link from "next/link";
import { Search } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import {
  formatAdminCurrency,
  formatAdminDateTime,
  getAdminUsers,
  requireAdminAccess,
} from "@/lib/admin";
import { Button } from "@/components/ui/button";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const resolved = await searchParams;
  const [{ profile }, users] = await Promise.all([
    requireAdminAccess(),
    getAdminUsers(resolved.q),
  ]);

  return (
    <AdminShell
      currentSection="/admin/users"
      title="User management"
      description="Search users, review plan tier and usage, and spot accounts that need support."
      adminName={profile?.full_name}
    >
      <DashboardPanel
        title="Directory"
        description="This first pass focuses on account lookup, plan visibility, and light operational context."
      >
        <form className="mb-5 flex flex-col gap-3 rounded-3xl bg-canvas p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-ink-muted sm:min-w-[22rem]">
            <Search className="size-4 text-brand" />
            <input
              className="w-full bg-transparent text-sm text-ink outline-none"
              defaultValue={resolved.q ?? ""}
              name="q"
              placeholder="Search by email, name, phone, or plan"
              type="search"
            />
          </div>
          <button className="rounded-full bg-[linear-gradient(135deg,#ff7bd5_0%,#a54dff_36%,#2f8fff_100%)] px-5 py-3 text-sm font-medium text-white shadow-[0_14px_30px_rgba(101,85,176,0.12)]" type="submit">
            Search users
          </button>
        </form>

        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="rounded-3xl border border-border bg-white/70 p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-lg font-semibold text-ink">{user.fullName ?? "Unnamed user"}</p>
                  <p className="mt-1 text-sm text-ink-muted">{user.email ?? user.id}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-canvas px-3 py-1 text-xs uppercase tracking-[0.18em] text-ink-muted">
                    {user.planTier}
                  </span>
                  <span className="rounded-full bg-canvas px-3 py-1 text-xs uppercase tracking-[0.18em] text-ink-muted">
                    {user.eventCount} event{user.eventCount === 1 ? "" : "s"}
                  </span>
                  <Button asChild variant="secondary">
                    <Link href={`/admin/users/${user.id}`}>Open user</Link>
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Monthly requests", value: String(user.monthlyRequests) },
                  { label: "Monthly cost", value: formatAdminCurrency(user.monthlyCostUsd) },
                  { label: "Created", value: formatAdminDateTime(user.createdAt) },
                  { label: "Last activity", value: formatAdminDateTime(user.lastActivityAt) },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl bg-canvas px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-ink">{item.value}</p>
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
