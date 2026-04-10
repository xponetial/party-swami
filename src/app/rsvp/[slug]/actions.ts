"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { checkPublicRsvpRateLimit } from "@/lib/security/public-rate-limits";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const publicRsvpSchema = z.object({
  slug: z.string().min(1),
  guestToken: z.string().min(1, "Missing RSVP token."),
  status: z.enum(["confirmed", "declined", "pending"]),
  plusOneCount: z.coerce.number().int().min(0),
});

export type PublicRsvpState = {
  error?: string;
  success?: string;
};

export async function submitPublicRsvpAction(
  _prevState: PublicRsvpState,
  formData: FormData,
): Promise<PublicRsvpState> {
  const headerStore = await headers();
  const rateLimit = await checkPublicRsvpRateLimit(headerStore, formData.get("slug")?.toString());

  if (!rateLimit.allowed) {
    return {
      error: "Too many RSVP attempts. Please wait a few minutes and try again.",
    };
  }

  const parsed = publicRsvpSchema.safeParse({
    slug: formData.get("slug"),
    guestToken: formData.get("guestToken"),
    status: formData.get("status"),
    plusOneCount: formData.get("plusOneCount") || 0,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Please check your RSVP details and try again.",
    };
  }

  const normalizedPlusOneCount =
    parsed.data.status === "confirmed" ? parsed.data.plusOneCount : 0;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("submit_public_rsvp", {
    p_slug: parsed.data.slug,
    p_guest_token: parsed.data.guestToken,
    p_status: parsed.data.status,
    p_plus_one_count: normalizedPlusOneCount,
  });

  if (error) {
    return {
      error: error.message,
    };
  }

  redirect(
    `/rsvp/${parsed.data.slug}?guest=${encodeURIComponent(parsed.data.guestToken)}&success=1&status=${encodeURIComponent(parsed.data.status)}&plusOnes=${normalizedPlusOneCount}`,
  );
}
