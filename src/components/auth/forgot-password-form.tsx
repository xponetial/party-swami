"use client";

import { useActionState } from "react";
import { forgotPasswordAction, type AuthActionState } from "@/app/(auth)/actions";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TurnstileGate } from "@/components/security/turnstile-gate";

const initialState: AuthActionState = {};

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(forgotPasswordAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="forgot-email">Email</Label>
        <Input
          id="forgot-email"
          name="email"
          type="email"
          placeholder="host@example.com"
          required
        />
      </div>
      <TurnstileGate autoExecute inputName="turnstileToken" />
      {state.error ? (
        <p
          className="rounded-2xl border border-brand/20 bg-brand/10 px-4 py-3 text-sm text-brand"
          aria-live="polite"
        >
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p
          className="rounded-2xl border border-accent/20 bg-accent-soft px-4 py-3 text-sm text-accent"
          aria-live="polite"
        >
          {state.success}
        </p>
      ) : null}
      <AuthSubmitButton pendingLabel="Sending reset link...">Email reset link</AuthSubmitButton>
    </form>
  );
}
