import Link from "next/link";
import { ReactNode } from "react";
import {
  ArrowLeft,
  ChartNoAxesCombined,
  ClipboardList,
  CreditCard,
  Images,
  Sparkles,
  Store,
} from "lucide-react";
import { MembershipMenu } from "@/components/auth/membership-menu";
import { ImageBudgetMeter } from "@/components/layout/image-budget-meter";
import { BrandLockup } from "@/components/layout/brand-lockup";
import { SiteFooter } from "@/components/layout/site-footer";
import { SupportFab } from "@/components/contact/support-fab";
import { Button } from "@/components/ui/button";
import { getInviteImageUsageForUser } from "@/lib/ai/usage";
import { getMarketplaceMembershipTier } from "@/lib/marketplace";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ContactContext } from "@/lib/contact-email";
import { cn } from "@/lib/utils";

const sections = [
  { href: "/dashboard", label: "Dashboard", icon: ChartNoAxesCombined },
  { href: "/events/new", label: "New Event", icon: ClipboardList },
  { href: "/marketplace", label: "Marketplace", icon: Store },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/", label: "Marketing", icon: Sparkles },
];

const eventSections = [
  { key: "overview", href: "", label: "Overview" },
  { key: "invite", href: "/invite", label: "Invite" },
  { key: "guests", href: "/guests/add", label: "Guests" },
  { key: "next-steps", href: "/next-steps", label: "Pick Your Path" },
  { key: "shopping", href: "/shopping", label: "Shopping" },
  { key: "planners", href: "/planners", label: "Planner Search" },
  { key: "timeline", href: "/timeline", label: "Timeline" },
  { key: "settings", href: "/settings", label: "Settings" },
] as const;

type EventNavKey = (typeof eventSections)[number]["key"];

type AppShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
  currentSection?: string;
  eventNav?: {
    eventId: string;
    eventTitle?: string;
    active: EventNavKey;
  };
};

function getAppContactContext(currentSection?: string, eventNavActive?: EventNavKey): ContactContext {
  if (eventNavActive === "invite") {
    return "invites";
  }

  if (currentSection === "/dashboard") {
    return "dashboard";
  }

  return "support";
}

export async function AppShell({
  title,
  description,
  children,
  actions,
  backHref,
  backLabel = "Back to event overview",
  currentSection,
  eventNav,
}: AppShellProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("plan_tier")
        .eq("id", user.id)
        .maybeSingle<{ plan_tier: string | null }>()
    : { data: null };
  const marketplaceMembershipTier = user ? await getMarketplaceMembershipTier(user.id, user.email) : null;
  const providerWorkspace =
    user?.user_metadata?.membership_type === "vendor"
      ? "vendor"
      : user?.user_metadata?.membership_type === "planner"
        ? "planner"
        : marketplaceMembershipTier === "vendor"
          ? "vendor"
          : marketplaceMembershipTier === "professional_party_planner"
            ? "planner"
            : null;
  const planTier =
    providerWorkspace === "vendor"
      ? "vendor"
      : providerWorkspace === "planner"
        ? "professional_party_planner"
        : profile?.plan_tier ?? "free";
  const hasImageAccess = planTier === "pro" || planTier === "admin";
  const imageUsage =
    user && hasImageAccess
      ? await getInviteImageUsageForUser(supabase, user.id, planTier === "admin" ? "admin" : "pro")
      : null;
  const providerDashboardHref = providerWorkspace === "vendor" ? "/vendors/dashboard" : "/planners/dashboard";
  const visibleSections = providerWorkspace
    ? [
        {
          href: providerDashboardHref,
          label: providerWorkspace === "vendor" ? "Vendor Dashboard" : "Planner Dashboard",
          icon: Store,
        },
      ]
    : [
        ...sections.slice(0, 3),
        ...(hasImageAccess ? [{ href: "/images", label: "Image Library", icon: Images }] : []),
        ...sections.slice(3),
        ...(planTier === "admin" ? [{ href: "/admin", label: "Admin", icon: Sparkles }] : []),
      ];
  const contactContext = getAppContactContext(currentSection, eventNav?.active);

  return (
    <>
      {user ? (
        <div className="fixed right-4 top-4 z-[70] sm:right-6 sm:top-5 lg:right-8 lg:top-6">
          <MembershipMenu
            email={user.email}
            planTier={planTier}
            dashboardHref={providerWorkspace ? providerDashboardHref : "/dashboard"}
            providerOnly={Boolean(providerWorkspace)}
          />
        </div>
      ) : null}
      <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <SupportFab context={contactContext} pageLabel={title} />
        <aside className="hidden w-72 shrink-0 flex-col rounded-[2rem] border border-white/75 bg-[linear-gradient(180deg,rgba(255,224,244,0.9)_0%,rgba(245,222,255,0.84)_28%,rgba(228,236,255,0.84)_62%,rgba(210,236,255,0.9)_100%)] p-5 shadow-party backdrop-blur lg:flex">
        <div className="rounded-3xl bg-white/30 p-4">
          <BrandLockup
            imageWidth={210}
            subtitle={
              providerWorkspace
                ? providerWorkspace === "vendor"
                  ? "Vendor workspace for storefront status, lead requests, packages, and review responses."
                  : "Planner workspace for profile status, client requests, packages, and review responses."
                : "Browser-based planning, invites, guests, shopping, and tasks in one host workspace."
            }
            priority
          />
        </div>
        <nav className="mt-6 space-y-2">
          {visibleSections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-ink-muted transition hover:bg-white/45 hover:text-ink",
                currentSection === section.href && "bg-white/55 text-ink shadow-[0_12px_24px_rgba(101,85,176,0.12)]",
              )}
            >
              <span data-tour-id={section.href === "/dashboard" ? "dashboard-link" : section.href === "/events/new" ? "new-event-link" : section.href === "/billing" ? "billing-link" : undefined} className="flex items-center gap-3">
                <section.icon className="size-4 text-brand" />
                {section.label}
              </span>
            </Link>
          ))}
        </nav>
        {!providerWorkspace && eventNav ? (
          <div className="mt-6 rounded-[1.75rem] border border-white/70 bg-white/35 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Current event</p>
            <p className="mt-2 text-sm font-semibold text-ink">{eventNav.eventTitle ?? "Event workspace"}</p>
            <nav className="mt-4 space-y-2">
              {eventSections.map((section) => {
                const href = `/events/${eventNav.eventId}${section.href}`;
                const isActive = eventNav.active === section.key;

                return (
                  <Link
                    key={section.key}
                    href={href}
                    className={cn(
                      "flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium text-ink-muted transition hover:bg-white/55 hover:text-ink",
                      isActive && "bg-white/70 text-ink shadow-[0_12px_24px_rgba(101,85,176,0.14)]",
                    )}
                    data-tour-id={`event-nav-${section.key}`}
                  >
                    <span>{section.label}</span>
                    {isActive ? <span className="text-xs uppercase tracking-[0.18em] text-brand">Now</span> : null}
                  </Link>
                );
              })}
            </nav>
          </div>
        ) : null}
        <div className="mt-auto space-y-3">
          {!providerWorkspace && imageUsage ? (
            <ImageBudgetMeter initialUsage={imageUsage} />
          ) : null}
          <div className="rounded-3xl bg-[linear-gradient(135deg,_rgba(38,146,255,0.96),_rgba(139,70,255,0.92))] px-4 py-5 text-white">
            <p className="text-sm uppercase tracking-[0.18em] text-white/70">
              {providerWorkspace ? "Marketplace provider account" : "AI host operating system"}
            </p>
            <p className="mt-2 text-lg font-semibold">
              {providerWorkspace
                ? providerWorkspace === "vendor"
                  ? "Review leads and grow your storefront"
                  : "Manage inquiries and planning packages"
                : "Plan, invite, track, and execute"}
            </p>
            <p className="mt-2 text-sm leading-6 text-white/85">
              {providerWorkspace
                ? providerWorkspace === "vendor"
                  ? "This workspace is dedicated to your vendor profile, approval status, packages, and lead follow-up."
                  : "This workspace is dedicated to your planner profile, approval status, service packages, and client follow-up."
                : "The workspace now carries the Party Swami brand through the shell so every flow feels connected."}
            </p>
          </div>
        </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <header data-tour-id="workspace-header" className="rounded-[2rem] border border-white/75 bg-[linear-gradient(135deg,rgba(255,248,255,0.9)_0%,rgba(243,233,255,0.88)_38%,rgba(236,245,255,0.9)_74%,rgba(255,247,226,0.82)_100%)] px-6 py-5 shadow-party backdrop-blur">
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
                <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Party Swami workspace</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{title}</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">{description}</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-3">
                {actions ? actions : null}
              </div>
            </div>
          </header>
          <main data-tour-id="page-main" className="grid gap-4">{children}</main>
          <SiteFooter contactContext={contactContext} pageLabel={title} />
        </div>
      </div>
    </>
  );
}
