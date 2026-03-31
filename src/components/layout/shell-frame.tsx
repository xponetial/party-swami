import Link from "next/link";
import { ReactNode } from "react";
import { CalendarHeart, Sparkles } from "lucide-react";

type ShellFrameProps = {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  description?: string;
};

export function ShellFrame({ children, eyebrow, title, description }: ShellFrameProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-10 flex flex-col gap-6 rounded-[2rem] border border-white/60 bg-surface px-6 py-5 shadow-party backdrop-blur xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-3">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-brand text-white shadow-lg">
              <CalendarHeart className="size-5" />
            </span>
            <span>
              <span className="block text-lg font-semibold tracking-tight text-ink">PartyGenie</span>
              <span className="block text-sm text-ink-muted">AI-powered event operating system</span>
            </span>
          </Link>
          {(eyebrow || title || description) && (
            <div className="space-y-2">
              {eyebrow ? (
                <p className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
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
              className="rounded-full border border-border bg-white/70 px-4 py-2 text-ink-muted transition hover:border-brand/40 hover:text-ink"
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
