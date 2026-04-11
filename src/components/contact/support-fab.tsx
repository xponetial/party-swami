"use client";

import { ContactContext } from "@/lib/contact-email";
import { ContactLink } from "@/components/contact/contact-link";
import { FeedbackLink } from "@/components/contact/feedback-link";

export function SupportFab({
  context = "support",
  pageLabel = "Current page",
}: {
  context?: ContactContext;
  pageLabel?: string;
}) {
  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
      <div className="flex flex-wrap justify-end gap-2">
        <FeedbackLink
          context={context}
          intent="bug"
          pageLabel={pageLabel}
          label="Report bug"
          className="inline-flex rounded-full border border-white/20 bg-white px-3 py-2 text-xs font-medium text-ink shadow-[0_10px_24px_rgba(17,24,39,0.12)] transition hover:border-brand/40 hover:text-brand"
        />
        <FeedbackLink
          context={context}
          intent="feature"
          pageLabel={pageLabel}
          label="Request feature"
          className="inline-flex rounded-full border border-white/20 bg-white px-3 py-2 text-xs font-medium text-ink shadow-[0_10px_24px_rgba(17,24,39,0.12)] transition hover:border-brand/40 hover:text-brand"
        />
      </div>
      <ContactLink
        emailKey="support"
        context={context}
        pageLabel={pageLabel}
        label="Support"
        className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-medium text-white shadow-[0_16px_30px_rgba(47,143,255,0.28)] transition hover:bg-brand-dark"
      />
    </div>
  );
}
