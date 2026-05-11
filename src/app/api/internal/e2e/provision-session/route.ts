import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProvisionBody = {
  email?: string;
  password?: string;
};

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return NextResponse.json({ ok: false, message: "Missing Supabase env config." }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as ProvisionBody;
  const email = body.email ?? "e2e-party-swami-auth@mailinator.com";
  const password = body.password ?? "Tmp#123456789";

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const publicClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      source: "playwright-e2e",
    },
  });

  if (created.error && !/already/i.test(created.error.message)) {
    return NextResponse.json({ ok: false, message: created.error.message }, { status: 400 });
  }

  if (created.error && /already/i.test(created.error.message)) {
    const users = await admin.auth.admin.listUsers();
    const existingUser = users.data?.users?.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      const updated = await admin.auth.admin.updateUserById(existingUser.id, {
        password,
        email_confirm: true,
      });
      if (updated.error) {
        return NextResponse.json({ ok: false, message: updated.error.message }, { status: 400 });
      }
    }
  }

  const signedIn = await publicClient.auth.signInWithPassword({
    email,
    password,
  });

  if (signedIn.error || !signedIn.data.session) {
    return NextResponse.json(
      { ok: false, message: signedIn.error?.message ?? "Unable to create session." },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const setSession = await supabase.auth.setSession({
    access_token: signedIn.data.session.access_token,
    refresh_token: signedIn.data.session.refresh_token,
  });

  if (setSession.error) {
    return NextResponse.json({ ok: false, message: setSession.error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
