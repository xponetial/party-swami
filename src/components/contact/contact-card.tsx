import { ReactNode } from "react";
import { ContactEmailKey, ContactContext, ContactIntent, getContactEmail } from "@/lib/contact-email";
import { ContactLink } from "@/components/contact/contact-link";

type ContactCardProps = {
  title: string;
  description: string;
  emailKey: ContactEmailKey;
  context?: ContactContext;
  intent?: ContactIntent;
  note?: ReactNode;
};

export function ContactCard({
  title,
  description,
  emailKey,
  context,
  intent,
  note,
}: ContactCardProps) {
  return (
    <div className="rounded-[1.75rem] border border-border bg-white/80 p-5 shadow-sm">
      <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">{title}</p>
      <p className="mt-3 text-sm leading-6 text-ink-muted">{description}</p>
      <ContactLink
        emailKey={emailKey}
        context={context}
        intent={intent}
        pageLabel={title}
        className="mt-4 inline-flex rounded-full border border-border bg-canvas px-4 py-2 text-sm font-medium text-ink transition hover:border-brand/40 hover:text-brand"
      />
      {note ? <div className="mt-3 text-xs leading-5 text-ink-muted">{note}</div> : null}
      {!note ? (
        <p className="mt-3 text-xs leading-5 text-ink-muted">
          Opens your email client with <span className="font-medium text-ink">{getContactEmail(emailKey)}</span>.
        </p>
      ) : null}
    </div>
  );
}
