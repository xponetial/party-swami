import { APP_NAME } from "@/lib/constants";
import { ContactLink } from "@/components/contact/contact-link";
import { ContactContext } from "@/lib/contact-email";

export function SiteFooter({
  className = "",
  contactContext = "marketing",
  pageLabel = "Current page",
}: {
  className?: string;
  contactContext?: ContactContext;
  pageLabel?: string;
}) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={`rounded-[1.5rem] border border-white/70 bg-white/45 px-5 py-4 text-sm text-ink-muted backdrop-blur ${className}`.trim()}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <p>&copy; {year} {APP_NAME}. All rights reserved.</p>
          <p>AI-powered party planning, invitations, guests, shopping, and task flow.</p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <ContactLink emailKey="hello" context="marketing" pageLabel={pageLabel} className="transition hover:text-ink" />
          <ContactLink emailKey="support" context={contactContext} pageLabel={pageLabel} className="transition hover:text-ink" />
          <ContactLink emailKey="sales" context="pricing" pageLabel={pageLabel} className="transition hover:text-ink" />
          <ContactLink
            emailKey="support"
            context={contactContext}
            intent="bug"
            pageLabel={pageLabel}
            label="Report bug"
            className="transition hover:text-ink"
          />
          <ContactLink
            emailKey="support"
            context={contactContext}
            intent="feature"
            pageLabel={pageLabel}
            label="Request feature"
            className="transition hover:text-ink"
          />
        </div>
      </div>
    </footer>
  );
}
