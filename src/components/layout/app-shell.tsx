import Link from "next/link";
import { ReactNode } from "react";
import {
  ArrowLeft,
  ChartNoAxesCombined,
  ClipboardList,
  Sparkles,
} from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { BrandLockup } from "@/components/layout/brand-lockup";
import { Button } from "@/components/ui/button";
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
      <aside className="hidden w-72 shrink-0 flex-col rounded-[2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(247,213,255,0.82)_0%,rgba(236,225,255,0.78)_30%,rgba(223,237,255,0.82)_68%,rgba(206,229,255,0.88)_100%)] p-5 shadow-party backdrop-blur lg:flex">
        <div className="rounded-3xl bg-white/30 p-4">
          <BrandLockup
            imageWidth={210}
            subtitle="Browser-based planning, invites, guests, shopping, and tasks in one host workspace."
            priority
          />
        </div>
        <nav className="mt-6 space-y-2">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-ink-muted transition hover:bg-white/45 hover:text-ink",
              )}
            >
              <section.icon className="size-4 text-brand" />
              {section.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-3xl bg-[linear-gradient(135deg,_rgba(38,146,255,0.96),_rgba(139,70,255,0.92))] px-4 py-5 text-white">
          <p className="text-sm uppercase tracking-[0.18em] text-white/70">AI host operating system</p>
          <p className="mt-2 text-lg font-semibold">Plan, invite, track, and execute</p>
          <p className="mt-2 text-sm leading-6 text-white/85">
            The workspace now carries the Party Genie brand through the shell so every flow feels connected.
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <header className="rounded-[2rem] border border-white/70 bg-canvas px-6 py-5 shadow-party backdrop-blur">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              {backHref ? (
                <Button asChild className="gap-2 text-xs uppercase tracking-[0.18em]">
                  <Link href={backHref}>
                    <ArrowLeft className="size-3.5" />
                    {backLabel}
                  </Link>
                </Button>
              ) : null}
              <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Party Genie workspace</p>
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
