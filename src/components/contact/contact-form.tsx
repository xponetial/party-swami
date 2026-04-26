"use client";

import { FormEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TurnstileGate, type TurnstileGateHandle } from "@/components/security/turnstile-gate";
import { CONTACT_FORM_CATEGORY_OPTIONS, buildContactFormDefaults } from "@/lib/contact-form";
import { ContactContext, ContactFormCategory } from "@/lib/contact-email";

type ContactFormProps = {
  initialName?: string;
  initialEmail?: string;
  initialCategory?: ContactFormCategory;
  initialContext?: ContactContext;
  initialPageLabel?: string;
  initialPagePath?: string;
  initialPageUrl?: string;
};

export function ContactForm({
  initialName,
  initialEmail,
  initialCategory = "general",
  initialContext,
  initialPageLabel,
  initialPagePath,
  initialPageUrl,
}: ContactFormProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const formRef = useRef<HTMLFormElement>(null);
  const turnstileRef = useRef<TurnstileGateHandle>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [category, setCategory] = useState<ContactFormCategory>(initialCategory);
  const initialDefaults = buildContactFormDefaults({
    category: initialCategory,
    context: initialContext,
    pageLabel: initialPageLabel,
    pagePath: initialPagePath,
    pageUrl: initialPageUrl,
  });
  const [subject, setSubject] = useState(initialDefaults.subject);
  const [message, setMessage] = useState(initialDefaults.message);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!siteKey) {
      setError("Turnstile is not configured yet. Add the Turnstile keys before using the contact form.");
      return;
    }

    setPending(true);
    setError(null);
    setSuccess(null);

    const turnstileToken = await turnstileRef.current?.getToken();

    if (!turnstileToken) {
      setPending(false);
      setError("Bot protection could not verify this request. Please try again.");
      return;
    }

    const form = formRef.current;

    if (!form) {
      setPending(false);
      setError("The contact form is unavailable right now. Please refresh and try again.");
      return;
    }

    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      category: String(formData.get("category") ?? category),
      subject: String(formData.get("subject") ?? ""),
      message: String(formData.get("message") ?? ""),
      context: String(formData.get("context") ?? initialContext ?? ""),
      pageLabel: String(formData.get("pageLabel") ?? initialPageLabel ?? ""),
      pagePath: String(formData.get("pagePath") ?? initialPagePath ?? ""),
      pageUrl:
        typeof window === "undefined"
          ? String(formData.get("pageUrl") ?? initialPageUrl ?? "")
          : `${window.location.origin}${window.location.pathname}${window.location.search}`,
      turnstileToken,
    };

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as { error?: string; success?: string };

      if (!response.ok) {
        setError(result.error ?? "Something went wrong while sending your message.");
        return;
      }

      setSuccess(result.success ?? "Your message is on its way.");
      setMessage("");

      if (category === "bug" || category === "feature") {
        const defaults = buildContactFormDefaults({
          category,
          context: initialContext,
          pageLabel: initialPageLabel,
          pagePath: initialPagePath,
          pageUrl: initialPageUrl,
        });
        setSubject(defaults.subject);
      }
    } catch {
      setError("Something went wrong while sending your message.");
    } finally {
      setPending(false);
    }
  }

  function handleCategoryChange(nextCategory: ContactFormCategory) {
    setCategory(nextCategory);
    const defaults = buildContactFormDefaults({
      category: nextCategory,
      context: initialContext,
      pageLabel: initialPageLabel,
      pagePath: initialPagePath,
      pageUrl: initialPageUrl,
    });
    setSubject(defaults.subject);
    setMessage(defaults.message);
  }

  return (
    <div className="rounded-[2rem] border border-white/75 bg-white/80 p-6 shadow-sm">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">Structured feedback</p>
        <h2 className="text-2xl font-semibold tracking-tight text-ink">Send a routed message without leaving the app.</h2>
        <p className="text-sm leading-6 text-ink-muted">
          Use this form for bug reports, feature requests, support questions, or business inquiries. We route each
          submission to the right Party Swami inbox and keep the sender reply-ready.
        </p>
      </div>

      <form ref={formRef} className="mt-6 grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contact-name">Name</Label>
            <Input id="contact-name" name="name" defaultValue={initialName ?? ""} placeholder="Your name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-email">Email</Label>
            <Input
              id="contact-email"
              name="email"
              type="email"
              defaultValue={initialEmail ?? ""}
              placeholder="you@example.com"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-category">What do you need?</Label>
          <select
            id="contact-category"
            name="category"
            value={category}
            onChange={(event) => handleCategoryChange(event.target.value as ContactFormCategory)}
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand/50 focus:ring-4 focus:ring-brand/10"
          >
            {CONTACT_FORM_CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs leading-5 text-ink-muted">
            {CONTACT_FORM_CATEGORY_OPTIONS.find((option) => option.value === category)?.description}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-subject">Subject</Label>
          <Input
            id="contact-subject"
            name="subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="How can we help?"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-message">Message</Label>
          <textarea
            id="contact-message"
            name="message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={10}
            className="min-h-52 w-full rounded-[1.5rem] border border-border bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink-muted focus:border-brand/50 focus:ring-4 focus:ring-brand/10"
            required
          />
        </div>

        <input type="hidden" name="context" value={initialContext ?? ""} />
        <input type="hidden" name="pageLabel" value={initialPageLabel ?? ""} />
        <input type="hidden" name="pagePath" value={initialPagePath ?? ""} />
        <input type="hidden" name="pageUrl" value={initialPageUrl ?? ""} />

        <TurnstileGate ref={turnstileRef} />

        {!siteKey ? (
          <p className="rounded-2xl border border-warning/30 bg-white px-4 py-3 text-sm text-ink-muted">
            Add `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` to enable secure form submissions.
          </p>
        ) : null}

        {error ? (
          <p className="rounded-2xl border border-brand/20 bg-brand/10 px-4 py-3 text-sm text-brand" aria-live="polite">
            {error}
          </p>
        ) : null}

        {success ? (
          <p
            className="rounded-2xl border border-accent/20 bg-accent-soft px-4 py-3 text-sm text-accent"
            aria-live="polite"
          >
            {success}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-ink-muted">
            Protected with Cloudflare Turnstile and routed through Party Swami&apos;s verified email system.
          </p>
          <Button className="min-w-44" disabled={pending} type="submit">
            {pending ? "Sending..." : "Send message"}
          </Button>
        </div>
      </form>
    </div>
  );
}
