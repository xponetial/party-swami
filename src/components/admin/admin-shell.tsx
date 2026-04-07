import Link from "next/link";
import { ReactNode } from "react";
import {
  ArrowLeft,
  Bot,
  CalendarDays,
  Flag,
  HandHelping,
  PlugZap,
  LayoutDashboard,
  LayoutTemplate,
  LineChart,
  Megaphone,
  PackageSearch,
  PiggyBank,
  Users,
} from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { BrandLockup } from "@/components/layout/brand-lockup";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const adminSections = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "Analytics", icon: LineChart },
  { href: "/admin/ai", label: "AI Control", icon: Bot },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/events", label: "Events", icon: CalendarDays },
  { href: "/admin/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/admin/social-media", label: "Social Media", icon: Megaphone },
  { href: "/admin/revenue", label: "Revenue", icon: PiggyBank },
  { href: "/admin/flags", label: "Flags", icon: Flag },
  { href: "/admin/support", label: "Support", icon: HandHelping },
  { href: "/admin/marketplace", label: "Marketplace", icon: PackageSearch },
  { href: "/admin/integrations", label: "Integrations", icon: PlugZap },
] as const;

type AdminShellProps = {
  currentSection: string;
  title: string;
  description: string;
  adminName?: string | null;
  actions?: ReactNode;
  children: ReactNode;
};

export function AdminShell({
  currentSection,
  title,
  description,
  adminName,
  actions,
  children,
}: AdminShellProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <aside className="hidden w-80 shrink-0 flex-col rounded-[2rem] border border-white/75 bg-[linear-gradient(180deg,rgba(255,224,244,0.9)_0%,rgba(245,222,255,0.84)_28%,rgba(228,236,255,0.84)_62%,rgba(210,236,255,0.9)_100%)] p-5 shadow-party backdrop-blur lg:flex">
        <div className="rounded-3xl bg-white/30 p-4">
          <BrandLockup
            imageWidth={210}
            subtitle="Internal command center for analytics, AI optimization, templates, and host operations."
            priority
          />
        </div>

        <Button asChild className="mt-4 justify-start gap-2 text-xs uppercase tracking-[0.18em]">
          <Link href="/dashboard">
            <ArrowLeft className="size-3.5" />
            Back to host dashboard
          </Link>
        </Button>

        <div className="mt-6 rounded-[1.75rem] border border-white/70 bg-white/35 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Admin workspace</p>
          <p className="mt-2 text-sm font-semibold text-ink">{adminName ?? "Admin operator"}</p>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            Watch the live product, guide growth, and keep Party Swami healthy from one place.
          </p>
        </div>

        <nav className="mt-6 space-y-2">
          {adminSections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-ink-muted transition hover:bg-white/45 hover:text-ink",
                currentSection === section.href && "bg-white/60 text-ink shadow-[0_12px_24px_rgba(101,85,176,0.12)]",
              )}
            >
              <section.icon className="size-4 text-brand" />
              {section.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto rounded-3xl bg-[linear-gradient(135deg,_rgba(38,146,255,0.96),_rgba(139,70,255,0.92))] px-4 py-5 text-white">
          <p className="text-sm uppercase tracking-[0.18em] text-white/70">Admin roadmap</p>
          <p className="mt-2 text-lg font-semibold">Operations, growth, controls, support, integrations</p>
          <p className="mt-2 text-sm leading-6 text-white/85">
            This workspace now spans the full internal product surface so the next business and support decisions can happen without leaving the app.
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <header className="rounded-[2rem] border border-white/75 bg-[linear-gradient(135deg,rgba(255,248,255,0.9)_0%,rgba(243,233,255,0.88)_38%,rgba(236,245,255,0.9)_74%,rgba(255,247,226,0.82)_100%)] px-6 py-5 shadow-party backdrop-blur">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Party Swami admin</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{title}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">{description}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              {actions}
              <LogoutButton />
            </div>
          </div>
        </header>

        <main className="grid gap-4">{children}</main>
      </div>
    </div>
  );
}
