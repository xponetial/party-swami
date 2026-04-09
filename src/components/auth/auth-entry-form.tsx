"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, Mail } from "lucide-react";
import {
  continueWithGoogleAction,
  sendMagicLinkAction,
  type AuthActionState,
} from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = {};

type AuthEntryFormProps = {
  next?: string;
  showRecoveryLink?: boolean;
};

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24">
      <path
        d="M21.64 12.2c0-.64-.06-1.25-.18-1.84H12v3.48h5.41a4.63 4.63 0 0 1-2 3.04v2.52h3.24c1.9-1.74 2.99-4.31 2.99-7.2Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.97-.9 6.63-2.43l-3.24-2.52c-.9.6-2.05.96-3.39.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.6A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.41 13.89A6.02 6.02 0 0 1 6.1 12c0-.66.11-1.3.31-1.89V7.5H3.06A10 10 0 0 0 2 12c0 1.61.39 3.13 1.06 4.5l3.35-2.61Z"
        fill="#FBBC04"
      />
      <path
        d="M12 5.98c1.47 0 2.78.5 3.82 1.47l2.86-2.86C16.96 2.98 14.7 2 12 2A10 10 0 0 0 3.06 7.5l3.35 2.61c.79-2.36 2.99-4.13 5.59-4.13Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function AuthEntryForm({ next = "/dashboard", showRecoveryLink = false }: AuthEntryFormProps) {
  const [googleState, googleFormAction, googlePending] = useActionState(
    continueWithGoogleAction,
    initialState,
  );
  const [emailState, emailFormAction, emailPending] = useActionState(
    sendMagicLinkAction,
    initialState,
  );

  return (
    <div className="space-y-6">
      <form action={googleFormAction}>
        <input type="hidden" name="next" value={next} />
        <Button
          className="w-full justify-between rounded-[1.5rem] border border-border bg-white px-5 py-4 text-left text-ink hover:bg-white"
          disabled={googlePending}
          type="submit"
          variant="secondary"
        >
          <span className="flex items-center gap-3">
            <GoogleIcon />
            <span>{googlePending ? "Connecting to Google..." : "Continue with Google"}</span>
          </span>
          <ArrowRight className="size-4 text-ink-muted" />
        </Button>
      </form>

      {googleState.error ? (
        <p
          className="rounded-2xl border border-brand/20 bg-brand/10 px-4 py-3 text-sm text-brand"
          aria-live="polite"
        >
          {googleState.error}
        </p>
      ) : null}

      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-ink-muted">or</p>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form action={emailFormAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />

        <div className="space-y-2">
          <Label htmlFor="auth-email">Email</Label>
          <Input
            id="auth-email"
            name="email"
            type="email"
            placeholder="host@example.com"
            required
          />
        </div>

        <Button className="w-full rounded-[1.5rem] py-3.5" disabled={emailPending} type="submit">
          <Mail className="size-4" />
          {emailPending ? "Sending magic link..." : "Continue with Email"}
        </Button>
      </form>

      <div className="rounded-[1.75rem] border border-border bg-canvas px-5 py-4">
        <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">No password required</p>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          We&apos;ll send a secure magic link so you can jump straight into your party workspace.
        </p>
      </div>

      {emailState.error ? (
        <p
          className="rounded-2xl border border-brand/20 bg-brand/10 px-4 py-3 text-sm text-brand"
          aria-live="polite"
        >
          {emailState.error}
        </p>
      ) : null}

      {emailState.success ? (
        <p
          className="rounded-2xl border border-accent/20 bg-accent-soft px-4 py-3 text-sm text-accent"
          aria-live="polite"
        >
          {emailState.success}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          "One-click login first",
          "Mobile-friendly flow",
          "Clear trust and speed signals",
        ].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-border bg-white/65 px-4 py-3 text-sm text-ink-muted"
          >
            {item}
          </div>
        ))}
      </div>

      {showRecoveryLink ? (
        <p className="text-sm text-ink-muted">
          Need a recovery email instead?{" "}
          <Link href="/forgot-password" className="font-medium text-brand hover:text-brand-dark">
            Reset password
          </Link>
        </p>
      ) : null}
    </div>
  );
}
