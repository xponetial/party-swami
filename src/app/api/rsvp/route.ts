import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  slug: z.string().min(1),
  guestToken: z.string().min(1),
  status: z.enum(["confirmed", "declined", "pending"]),
  plusOneCount: z.number().int().min(0).default(0),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: parsed.error.issues[0]?.message ?? "Invalid RSVP payload.",
      },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("submit_public_rsvp", {
    p_slug: parsed.data.slug,
    p_guest_token: parsed.data.guestToken,
    p_status: parsed.data.status,
    p_plus_one_count: parsed.data.plusOneCount,
  });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error.message,
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    rsvp: data?.[0] ?? null,
  });
}
