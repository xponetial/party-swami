import Link from "next/link";
import { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { BrandLockup } from "@/components/layout/brand-lockup";

type ShellFrameProps = {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  description?: string;
};

export function ShellFrame({ children, eyebrow, title, description }: ShellFrameProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-10 flex flex-col gap-6 rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,rgba(245,223,255,0.34)_0%,rgba(237,243,255,0.94)_56%,rgba(228,239,255,0.98)_100%)] px-6 py-5 shadow-party backdrop-blur xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-3">
          <BrandLockup
            imageWidth={190}
            subtitle="AI-powered event operating system"
            className="max-w-[280px]"
            priority
          />
          {(eyebrow || title || description) && (
            <div className="space-y-2">
              {eyebrow ? (
                <p className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
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
              className="rounded-full border border-white/70 bg-white/58 px-4 py-2 text-ink-muted transition hover:border-brand/40 hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
