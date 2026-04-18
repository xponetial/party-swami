import { NextRequest, NextResponse } from "next/server";
import { sanitizeNextPath } from "@/lib/auth/urls";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function isEmailOtpType(value: string | null): value is "email" | "signup" | "invite" | "magiclink" | "recovery" {
  return value === "email" || value === "signup" || value === "invite" || value === "magiclink" || value === "recovery";
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const tokenHash = formData.get("token_hash");
  const type = formData.get("type");
  const nextPath = sanitizeNextPath(formData.get("next"));

  const token = typeof tokenHash === "string" ? tokenHash : null;
  const otpType = typeof type === "string" ? type : null;

  if (!token || !isEmailOtpType(otpType)) {
    return NextResponse.redirect(
      new URL("/login?message=Invalid%20or%20expired%20sign-in%20link.%20Please%20request%20a%20new%20one.", request.url),
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: token,
    type: otpType,
  });

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?message=${encodeURIComponent(error.message)}`, request.url),
    );
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}
