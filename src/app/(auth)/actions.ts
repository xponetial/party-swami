"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getAppOrigin, sanitizeNextPath } from "@/lib/auth/urls";
import { getInviteFromEmail, getResendClient } from "@/lib/email/resend";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthActionState = {
  error?: string;
  success?: string;
};

const emailSchema = z.object({
  email: z.email("Enter a valid email address."),
});

const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address."),
});

function buildCallbackUrl(origin: string, nextPath: string) {
  const callbackUrl = new URL("/callback", origin);
  callbackUrl.searchParams.set("next", nextPath);
  return callbackUrl.toString();
}

export async function continueWithGoogleAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const origin = await getAppOrigin();
  const nextPath = sanitizeNextPath(formData.get("next"));
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: buildCallbackUrl(origin, nextPath),
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) {
    return {
      error: error.message,
    };
  }

  if (!data.url) {
    return {
      error: "Google sign-in is unavailable right now. Please use email instead.",
    };
  }

  redirect(data.url);
}

export async function sendMagicLinkAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = emailSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Enter a valid email address.",
    };
  }

  const origin = await getAppOrigin();
  const nextPath = sanitizeNextPath(formData.get("next"));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: buildCallbackUrl(origin, nextPath),
      shouldCreateUser: true,
    },
  });

  if (error) {
    return {
      error: error.message,
    };
  }

  return {
    success: "Check your email for a secure sign-in link. No password needed.",
  };
}

export async function forgotPasswordAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Enter a valid email address.",
    };
  }

  const origin = await getAppOrigin();
  const resetUrl = new URL("/reset-password", origin).toString();
  const supabase = createSupabaseAdminClient();
  const resend = getResendClient();

  if (!resend) {
    return {
      error: "Password reset email is not configured on the server yet.",
    };
  }

  const { data, error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email: parsed.data.email,
    options: {
      redirectTo: resetUrl,
    },
  });

  if (error) {
    // Avoid leaking whether the account exists.
    return {
      success: "If that email is registered, a password reset link is on the way.",
    };
  }

  const tokenHash = data.properties?.hashed_token;

  if (!tokenHash) {
    return {
      success: "If that email is registered, a password reset link is on the way.",
    };
  }

  const passwordResetLink = new URL("/reset-password", origin);
  passwordResetLink.searchParams.set("token_hash", tokenHash);
  passwordResetLink.searchParams.set("type", "recovery");

  const from = getInviteFromEmail();
  const subject = "Reset your Party Swami password";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #111827; line-height: 1.6;">
      <h1 style="font-size: 24px; margin-bottom: 16px;">Reset your password</h1>
      <p>We received a request to reset your Party Swami password.</p>
      <p>
        <a
          href="${passwordResetLink.toString()}"
          style="display: inline-block; padding: 12px 18px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600;"
        >
          Reset Password
        </a>
      </p>
      <p>If you did not request this, you can safely ignore this email.</p>
      <p>This link will expire automatically for your security.</p>
    </div>
  `;

  const { error: sendError } = await resend.emails.send({
    from,
    to: parsed.data.email,
    subject,
    html,
  });

  if (sendError) {
    return {
      error: sendError.message,
    };
  }

  return {
    success: "If that email is registered, a password reset link is on the way.",
  };
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
