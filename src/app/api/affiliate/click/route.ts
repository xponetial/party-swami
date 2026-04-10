import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAuditLog, trackAnalyticsEvent } from "@/lib/telemetry";

// Allowlist of trusted affiliate/shopping domains.
// AI-generated shopping links are restricted to these to prevent open redirect abuse.
const ALLOWED_AFFILIATE_DOMAINS = new Set([
  "amazon.com",
  "amazon.co.uk",
  "amazon.ca",
  "amazon.com.au",
  "amazon.de",
  "amazon.fr",
  "amazon.co.jp",
  "walmart.com",
  "target.com",
  "etsy.com",
  "partycity.com",
  "orientaltrading.com",
  "dollartree.com",
  "michaels.com",
  "hobbylobby.com",
  "joann.com",
  "wayfair.com",
  "costco.com",
  "samsclub.com",
  "instacart.com",
]);

function isAllowedAffiliateUrl(value: string): boolean {
  try {
    const parsed = new URL(value);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    // Strip leading "www." and check against allowlist
    const hostname = parsed.hostname.replace(/^www\./, "");

    return ALLOWED_AFFILIATE_DOMAINS.has(hostname);
  } catch {
    return false;
  }
}

const querySchema = z.object({
  eventId: z.string().uuid(),
  itemId: z.string().uuid(),
  target: z.string().refine(isAllowedAffiliateUrl, "Redirect target is not an allowed affiliate domain."),
});

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const parsed = querySchema.safeParse({
    eventId: requestUrl.searchParams.get("eventId"),
    itemId: requestUrl.searchParams.get("itemId"),
    target: requestUrl.searchParams.get("target"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: parsed.error.issues[0]?.message ?? "Invalid affiliate click parameters.",
      },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await Promise.all([
    trackAnalyticsEvent(supabase, {
      eventName: "shopping_link_clicked",
      userId: user?.id ?? null,
      eventId: parsed.data.eventId,
      metadata: {
        item_id: parsed.data.itemId,
        target: parsed.data.target,
        source: "shopping_recommendation_card",
      },
    }),
    createAuditLog(supabase, {
      action: "shopping_link_clicked",
      userId: user?.id ?? null,
      eventId: parsed.data.eventId,
      metadata: {
        item_id: parsed.data.itemId,
        target: parsed.data.target,
        source: "shopping_recommendation_card",
      },
    }),
  ]);

  return NextResponse.redirect(parsed.data.target, { status: 307 });
}
