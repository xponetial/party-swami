"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { TurnstileGate, type TurnstileGateHandle } from "@/components/security/turnstile-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ResetPasswordFormProps = {
  message?: string;
};

export function ResetPasswordForm({ message }: ResetPasswordFormProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const turnstileRef = useRef<TurnstileGateHandle>(null);
  const [isRecoveryReady, setIsRecoveryReady] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadRecoveryState() {
      const searchParams = new URLSearchParams(window.location.search);
      const tokenHash = searchParams.get("token_hash");
      const queryType = searchParams.get("type");
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const flowType = hashParams.get("type");

      if (tokenHash && queryType === "recovery") {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });

        if (!isMounted) {
          return;
        }

        if (verifyError) {
          setError(verifyError.message);
          setIsRecoveryReady(false);
          setIsCheckingSession(false);
          return;
        }

        setIsRecoveryReady(true);
        setIsCheckingSession(false);
        setError(null);
        return;
      }

      if (flowType === "recovery") {
        setIsRecoveryReady(true);
        setIsCheckingSession(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      setIsRecoveryReady(Boolean(session));
      setIsCheckingSession(false);
    }

    void loadRecoveryState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (!isMounted) {
        return;
      }

      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setIsRecoveryReady(true);
        setIsCheckingSession(false);
        setError(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setIsSubmitting(false);
      return;
    }

    const turnstileToken = await turnstileRef.current?.getToken();

    if (!turnstileToken) {
      setError("Bot protection could not verify this request. Please try again.");
      setIsSubmitting(false);
      return;
    }

    const verifyResponse = await fetch("/api/auth/verify-turnstile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ turnstileToken }),
    });

    if (!verifyResponse.ok) {
      const payload = await verifyResponse.json().catch(() => null);
      setError(payload?.message ?? "Bot protection check failed. Please try again.");
      setIsSubmitting(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setIsSubmitting(false);
      return;
    }

    setSuccess("Password updated. You can head back to the dashboard or sign in again.");
    setIsSubmitting(false);
    event.currentTarget.reset();
  }

  return (
    <div className="space-y-4">
      {message ? (
        <p className="rounded-2xl border border-accent/20 bg-accent-soft px-4 py-3 text-sm text-accent">
          {message}
        </p>
      ) : null}
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reset-password">New password</Label>
          <Input
            id="reset-password"
            name="password"
            type="password"
            placeholder="At least 8 characters"
            minLength={8}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            placeholder="Repeat your new password"
            minLength={8}
            required
          />
        </div>
        {!isRecoveryReady && !isCheckingSession ? (
          <p
            className="rounded-2xl border border-brand/20 bg-brand/10 px-4 py-3 text-sm text-brand"
            aria-live="polite"
          >
            Open this page from the password reset email, or request a new link if this session has
            expired.
          </p>
        ) : null}
        {error ? (
          <p
            className="rounded-2xl border border-brand/20 bg-brand/10 px-4 py-3 text-sm text-brand"
            aria-live="polite"
          >
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
        <TurnstileGate ref={turnstileRef} />
        <Button className="w-full" disabled={!isRecoveryReady || isCheckingSession || isSubmitting} type="submit">
          {isSubmitting ? "Updating password..." : "Update password"}
        </Button>
      </form>
      <p className="text-sm text-ink-muted">
        Need another email?{" "}
        <Link href="/forgot-password" className="font-medium text-brand hover:text-brand-dark">
          Request a fresh reset link
        </Link>
      </p>
    </div>
  );
}
