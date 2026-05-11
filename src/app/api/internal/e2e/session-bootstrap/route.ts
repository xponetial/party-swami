import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type BootstrapBody = {
  accessToken?: string;
  refreshToken?: string;
  next?: string;
};

function sanitizeNextPath(next: string | undefined) {
  if (!next || !next.startsWith("/")) {
    return "/dashboard";
  }
  return next;
}

function readBypassSecret(request: NextRequest) {
  return (
    request.headers.get("x-vercel-protection-bypass") ??
    request.nextUrl.searchParams.get("x-vercel-protection-bypass") ??
    ""
  );
}

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET ?? "";
  const providedSecret = readBypassSecret(request);

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as BootstrapBody;
  const accessToken = body.accessToken ?? "";
  const refreshToken = body.refreshToken ?? "";
  const nextPath = sanitizeNextPath(body.next);

  if (!accessToken || !refreshToken) {
    return NextResponse.json({ ok: false, message: "Missing token payload." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, next: nextPath });
}
