import Image from "next/image";
import Link from "next/link";
import { ChevronDown, CreditCard, Settings, UserCircle2 } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { cn } from "@/lib/utils";

type MembershipMenuProps = {
  planTier: string | null | undefined;
  email?: string | null;
};

type MembershipBadge = {
  label: string;
  imagePath: string;
};

const BADGES: Record<string, MembershipBadge> = {
  free: {
    label: "Free",
    imagePath: "/membership-badges/free.png",
  },
  pro: {
    label: "Pro",
    imagePath: "/membership-badges/pro.png",
  },
  vendor: {
    label: "Vendor",
    imagePath: "/membership-badges/vendor.png",
  },
  support: {
    label: "Support",
    imagePath: "/membership-badges/support.png",
  },
  professional_party_planner: {
    label: "Professional Party Planner",
    imagePath: "/membership-badges/professional-party-planner.png",
  },
  admin: {
    label: "Admin",
    imagePath: "/membership-badges/admin.png",
  },
};

function normalizeTier(planTier: string | null | undefined) {
  const value = (planTier ?? "free").toLowerCase();
  return BADGES[value] ? value : "free";
}

export function MembershipMenu({ planTier, email }: MembershipMenuProps) {
  const normalizedTier = normalizeTier(planTier);
  const activeBadge = BADGES[normalizedTier];

  return (
    <details className="group relative">
      <summary className="list-none inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/80 bg-[linear-gradient(135deg,rgba(255,247,255,0.92)_0%,rgba(240,232,255,0.92)_45%,rgba(236,245,255,0.92)_100%)] px-2 py-2 text-ink shadow-[0_14px_30px_rgba(101,85,176,0.12)] transition hover:border-brand/35 hover:bg-white">
        <Image
          alt={`${activeBadge.label} membership badge`}
          src={activeBadge.imagePath}
          width={40}
          height={40}
          className="size-10 rounded-full border border-border object-cover"
        />
        <span className="hidden text-xs font-semibold uppercase tracking-[0.16em] sm:inline">
          {activeBadge.label}
        </span>
        <ChevronDown className="size-4 text-ink-muted transition group-open:rotate-180" />
      </summary>

      <div className="absolute right-0 z-50 mt-3 w-80 rounded-3xl border border-border bg-white/95 p-4 shadow-party backdrop-blur">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-canvas p-3">
          <Image
            alt={`${activeBadge.label} membership badge`}
            src={activeBadge.imagePath}
            width={52}
            height={52}
            className="size-12 rounded-full border border-border object-cover"
          />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Current membership</p>
            <p className="truncate text-sm font-semibold text-ink">{activeBadge.label}</p>
            <p className="truncate text-xs text-ink-muted">{email ?? "Signed-in account"}</p>
          </div>
        </div>

        <div className="mt-3 grid gap-2">
          <Link
            href="/billing"
            className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-3 py-2 text-sm text-ink transition hover:border-brand/35 hover:text-brand"
          >
            <CreditCard className="size-4" />
            Billing
          </Link>
          <Link
            href="/events/new"
            className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-3 py-2 text-sm text-ink transition hover:border-brand/35 hover:text-brand"
          >
            <UserCircle2 className="size-4" />
            New Event
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-3 py-2 text-sm text-ink transition hover:border-brand/35 hover:text-brand"
          >
            <Settings className="size-4" />
            Workspace
          </Link>
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-canvas p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-ink-muted">Upcoming memberships</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["support", "vendor", "professional_party_planner"] as const).map((tier) => (
              <div
                key={tier}
                className={cn(
                  "flex items-center gap-2 rounded-xl border border-border bg-white/80 px-2 py-2 text-xs text-ink-muted",
                  normalizedTier === tier && "border-brand/35 text-ink",
                )}
              >
                <Image
                  alt={`${BADGES[tier].label} placeholder`}
                  src={BADGES[tier].imagePath}
                  width={26}
                  height={26}
                  className="size-6 rounded-full border border-border object-cover"
                />
                <span className="truncate">{BADGES[tier].label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <LogoutButton />
        </div>
      </div>
    </details>
  );
}
