"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { headers } from "next/headers";
import { getAppOrigin, sanitizeNextPath } from "@/lib/auth/urls";
import { getInviteFromEmail, getResendClient } from "@/lib/email/resend";
import { extractRemoteIp, verifyTurnstileToken } from "@/lib/security/turnstile";
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

function buildMagicLinkCallbackUrl(origin: string, nextPath: string, tokenHash: string, type: string) {
  const callbackUrl = new URL("/callback", origin);
  callbackUrl.searchParams.set("next", nextPath);
  callbackUrl.searchParams.set("token_hash", tokenHash);
  callbackUrl.searchParams.set("type", type);
  return callbackUrl.toString();
}

function buildAuthEmailShell({
  title,
  intro,
  ctaLabel,
  ctaUrl,
  outro,
}: {
  title: string;
  intro: string;
  ctaLabel: string;
  ctaUrl: string;
  outro: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #111827; line-height: 1.6;">
      <h1 style="font-size: 24px; margin-bottom: 16px;">${title}</h1>
      <p>${intro}</p>
      <p>
        <a
          href="${ctaUrl}"
          style="display: inline-block; padding: 12px 18px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600;"
        >
          ${ctaLabel}
        </a>
      </p>
      <p>${outro}</p>
    </div>
  `;
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

  const turnstileToken = String(formData.get("turnstileToken") ?? "").trim();

  if (turnstileToken) {
    try {
      const headerStore = await headers();
      const result = await verifyTurnstileToken({
        token: turnstileToken,
        remoteIp: extractRemoteIp(headerStore),
      });

      if (!result.success) {
        return { error: "Bot protection could not verify this request. Please try again." };
      }
    } catch {
      return { error: "Bot protection is unavailable right now. Please try again." };
    }
  }

  const origin = await getAppOrigin();
  const nextPath = sanitizeNextPath(formData.get("next"));
  const supabase = createSupabaseAdminClient();
  const resend = getResendClient();

  if (!resend) {
    return {
      error: "Magic link email is not configured on the server yet.",
    };
  }

  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: parsed.data.email,
    options: {
      redirectTo: buildCallbackUrl(origin, nextPath),
    },
  });

  if (error) {
    return {
      error: error.message,
    };
  }

  const tokenHash = data.properties?.hashed_token;
  const verificationType = data.properties?.verification_type;

  if (!tokenHash || !verificationType) {
    return {
      error: "Unable to generate a secure sign-in link right now.",
    };
  }

  const magicLink = buildMagicLinkCallbackUrl(origin, nextPath, tokenHash, verificationType);

  const from = getInviteFromEmail();
  const subject = "Your Party Swami sign-in link";
  const html = buildAuthEmailShell({
    title: "Sign in to Party Swami",
    intro: "Use this secure magic link to open your party workspace. No password required.",
    ctaLabel: "Open Party Swami",
    ctaUrl: magicLink,
    outro: "If you did not request this email, you can safely ignore it.",
  });

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

  const turnstileToken = String(formData.get("turnstileToken") ?? "").trim();

  if (turnstileToken) {
    try {
      const headerStore = await headers();
      const result = await verifyTurnstileToken({
        token: turnstileToken,
        remoteIp: extractRemoteIp(headerStore),
      });

      if (!result.success) {
        return { error: "Bot protection could not verify this request. Please try again." };
      }
    } catch {
      return { error: "Bot protection is unavailable right now. Please try again." };
    }
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
  const html = buildAuthEmailShell({
    title: "Reset your password",
    intro: "We received a request to reset your Party Swami password.",
    ctaLabel: "Reset Password",
    ctaUrl: passwordResetLink.toString(),
    outro: "If you did not request this, you can safely ignore this email. This link will expire automatically for your security.",
  });

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
