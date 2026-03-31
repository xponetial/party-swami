"use client";

import { useActionState } from "react";
import { signupAction, type AuthActionState } from "@/app/(auth)/actions";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = {};

export function SignupForm() {
  const [state, formAction] = useActionState(signupAction, initialState);

  return (
    <form action={formAction}>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="first-name">First name</Label>
          <Input id="first-name" name="firstName" placeholder="Jordan" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last-name">Last name</Label>
          <Input id="last-name" name="lastName" placeholder="Lee" required />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="signup-email">Email</Label>
          <Input
            id="signup-email"
            name="email"
            type="email"
            placeholder="host@example.com"
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="signup-password">Password</Label>
          <Input
            id="signup-password"
            name="password"
            type="password"
            placeholder="At least 8 characters"
            required
          />
        </div>
      </div>

      {state.error ? (
        <p
          className="mt-4 rounded-2xl border border-[#e7c2b7] bg-[#fff5f1] px-4 py-3 text-sm text-brand"
          aria-live="polite"
        >
          {state.error}
        </p>
      ) : null}

      <div className="mt-6 rounded-[1.5rem] bg-canvas p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-ink-muted">What happens next</p>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          PartyGenie will create your account, start a session when available, and otherwise send
          you through email confirmation before login.
        </p>
      </div>

      <div className="mt-6">
        <AuthSubmitButton pendingLabel="Creating account...">
          Continue to setup
        </AuthSubmitButton>
      </div>
    </form>
  );
}
