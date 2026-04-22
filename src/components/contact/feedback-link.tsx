"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ContactContext,
  ContactIntent,
  buildContactFormHref,
  getFormCategoryFromIntent,
} from "@/lib/contact-email";

type FeedbackLinkProps = {
  intent: Extract<ContactIntent, "bug" | "feature">;
  context?: ContactContext;
  label: string;
  pageLabel?: string;
  className?: string;
};

export function FeedbackLink({
  intent,
  context,
  label,
  pageLabel,
  className,
}: FeedbackLinkProps) {
  const pathname = usePathname();

  return (
    <Link
      href={buildContactFormHref({
        category: getFormCategoryFromIntent(intent),
        context,
        intent,
        pageLabel,
        pagePath: pathname,
      })}
      className={className}
    >
      {label}
    </Link>
  );
}
