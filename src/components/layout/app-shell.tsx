import Link from "next/link";
import { ReactNode } from "react";
import {
  ArrowLeft,
  ChartNoAxesCombined,
  ClipboardList,
  Sparkles,
} from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const sections = [
  { href: "/dashboard", label: "Dashboard", icon: ChartNoAxesCombined },
  { href: "/events/new", label: "New Event", icon: ClipboardList },
  { href: "/", label: "Marketing", icon: Sparkles },
];

type AppShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
};

export async function AppShell({
  title,
  description,
  children,
  actions,
  backHref,
  backLabel = "Back to event overview",
}: AppShellProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <aside className="hidden w-72 shrink-0 flex-col rounded-[2rem] border border-white/60 bg-surface p-5 shadow-party backdrop-blur lg:flex">
        <Link href="/" className="rounded-3xl bg-white/70 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">PartyGenie</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">Host workspace</p>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            Browser-based planning, invites, guests, shopping, and tasks.
          </p>
        </Link>
        <nav className="mt-6 space-y-2">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-ink-muted transition hover:bg-white/70 hover:text-ink",
              )}
            >
              <section.icon className="size-4 text-brand" />
              {section.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-3xl bg-brand px-4 py-5 text-white">
          <p className="text-sm uppercase tracking-[0.18em] text-white/70">Milestone 1</p>
          <p className="mt-2 text-lg font-semibold">Foundation first</p>
          <p className="mt-2 text-sm leading-6 text-white/80">
            This shell is intentionally modular so auth, data, and AI features can slot in cleanly
            next.
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <header className="rounded-[2rem] border border-white/60 bg-surface px-6 py-5 shadow-party backdrop-blur">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              {backHref ? (
                <Link
                  href={backHref}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-white/70 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-ink-muted transition hover:border-brand/40 hover:text-ink"
                >
                  <ArrowLeft className="size-3.5" />
                  {backLabel}
                </Link>
              ) : null}
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">PartyGenie MVP</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{title}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">{description}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              {actions ? actions : null}
              {user ? <LogoutButton /> : null}
            </div>
          </div>
        </header>
        <main className="grid gap-4">{children}</main>
      </div>
    </div>
  );
}
