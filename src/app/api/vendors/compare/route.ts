import { NextResponse } from "next/server";
import { z } from "zod";
import { getVendorsByIds } from "@/lib/marketplace";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  vendorIds: z.array(z.string().uuid()).min(2).max(5),
});

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "You must be signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid compare payload." },
      { status: 400 },
    );
  }

  const vendors = await getVendorsByIds(parsed.data.vendorIds);

  return NextResponse.json({
    ok: true,
    count: vendors.length,
    vendors,
  });
}
