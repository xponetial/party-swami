import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildRateLimitHeaders,
  checkPublicRsvpRateLimit,
} from "@/lib/security/public-rate-limits";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  slug: z.string().min(1),
  guestToken: z.string().min(1),
  status: z.enum(["confirmed", "declined", "pending"]),
  plusOneCount: z.number().int().min(0).default(0),
});

export async function POST(request: Request) {
  const rateLimit = await checkPublicRsvpRateLimit(request.headers);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        message: "Too many RSVP attempts. Please wait a few minutes and try again.",
      },
      {
        status: 429,
        headers: buildRateLimitHeaders(rateLimit),
      },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: parsed.error.issues[0]?.message ?? "Invalid RSVP payload.",
      },
      {
        status: 400,
        headers: buildRateLimitHeaders(rateLimit),
      },
    );
  }

  const normalizedPlusOneCount =
    parsed.data.status === "confirmed" ? parsed.data.plusOneCount : 0;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("submit_public_rsvp", {
    p_slug: parsed.data.slug,
    p_guest_token: parsed.data.guestToken,
    p_status: parsed.data.status,
    p_plus_one_count: normalizedPlusOneCount,
  });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error.message,
      },
      {
        status: 400,
        headers: buildRateLimitHeaders(rateLimit),
      },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      rsvp: data?.[0] ?? null,
    },
    {
      headers: buildRateLimitHeaders(rateLimit),
    },
  );
}
