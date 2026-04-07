import { APP_NAME } from "@/lib/constants";

export function SiteFooter({ className = "" }: { className?: string }) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={`rounded-[1.5rem] border border-white/70 bg-white/45 px-5 py-4 text-sm text-ink-muted backdrop-blur ${className}`.trim()}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {year} {APP_NAME}. All rights reserved.</p>
        <p>AI-powered party planning, invitations, guests, shopping, and task flow.</p>
      </div>
    </footer>
  );
}
