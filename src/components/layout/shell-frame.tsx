import Link from "next/link";
import { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { BrandLockup } from "@/components/layout/brand-lockup";
import { SiteFooter } from "@/components/layout/site-footer";

type ShellFrameProps = {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  description?: string;
  brandVisual?: ReactNode;
};

export function ShellFrame({
  children,
  eyebrow,
  title,
  description,
  brandVisual,
}: ShellFrameProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-10 flex flex-col gap-6 rounded-[2rem] border border-white/75 bg-[linear-gradient(135deg,rgba(255,237,247,0.82)_0%,rgba(248,231,255,0.9)_34%,rgba(236,244,255,0.9)_72%,rgba(255,246,223,0.82)_100%)] px-6 py-5 shadow-party backdrop-blur xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-3">
          {brandVisual ?? (
            <BrandLockup
              imageWidth={190}
              subtitle="AI-powered event operating system"
              className="max-w-[280px]"
              priority
            />
          )}
          {(eyebrow || title || description) && (
            <div className="space-y-2">
              {eyebrow ? (
                <p className="inline-flex items-center gap-2 rounded-full bg-white/72 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-ink-muted shadow-[0_8px_20px_rgba(128,102,193,0.08)]">
                  <Sparkles className="size-3.5 text-brand" />
                  {eyebrow}
                </p>
              ) : null}
              {title ? <h1 className="text-3xl font-semibold tracking-tight text-ink">{title}</h1> : null}
              {description ? <p className="max-w-3xl text-sm leading-6 text-ink-muted">{description}</p> : null}
            </div>
          )}
        </div>
        <nav className="flex flex-wrap gap-2 text-sm">
          {[
            { href: "/pricing", label: "Pricing" },
            { href: "/privacy", label: "Privacy" },
            { href: "/terms", label: "Terms" },
            { href: "/login", label: "Login" },
            { href: "/signup", label: "Signup" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border border-white/75 bg-[linear-gradient(135deg,rgba(255,252,255,0.86)_0%,rgba(243,234,255,0.82)_48%,rgba(236,246,255,0.84)_100%)] px-4 py-2 text-ink-muted transition hover:border-brand/40 hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <SiteFooter className="mt-8" />
    </div>
  );
}
