"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ContactEmailKey,
  ContactContext,
  ContactIntent,
  buildMailtoHref,
  getContactEmail,
} from "@/lib/contact-email";

type ContactLinkProps = {
  emailKey: ContactEmailKey;
  context?: ContactContext;
  intent?: ContactIntent;
  label?: string;
  pageLabel?: string;
  className?: string;
};

export function ContactLink({
  emailKey,
  context,
  intent = "general",
  label,
  pageLabel,
  className,
}: ContactLinkProps) {
  const pathname = usePathname();

  return (
    <Link
      href={
        buildMailtoHref(emailKey, context
          ? {
              context,
              intent,
              pageLabel,
              pagePath: pathname,
            }
          : undefined)
      }
      className={className}
    >
      {label ?? getContactEmail(emailKey)}
    </Link>
  );
}
