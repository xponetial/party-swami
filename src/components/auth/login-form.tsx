"use client";

import { useActionState } from "react";
import { loginAction, type AuthActionState } from "@/app/(auth)/actions";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = {};

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="host@example.com" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Enter your password"
          required
        />
      </div>
      {state.error ? (
        <p
          className="rounded-2xl border border-[#e7c2b7] bg-[#fff5f1] px-4 py-3 text-sm text-brand"
          aria-live="polite"
        >
          {state.error}
        </p>
      ) : null}
      <AuthSubmitButton pendingLabel="Signing in...">Login</AuthSubmitButton>
    </form>
  );
}
