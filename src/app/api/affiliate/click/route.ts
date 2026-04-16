import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAuditLog, trackAnalyticsEvent } from "@/lib/telemetry";

const AMAZON_AFFILIATE_DOMAINS = [
  "amazon.com",
  "amazon.co.uk",
  "amazon.ca",
  "amazon.com.au",
  "amazon.de",
  "amazon.fr",
  "amazon.co.jp",
] as const;
const AMAZON_AFFILIATE_DOMAIN_SET = new Set<string>(AMAZON_AFFILIATE_DOMAINS);

// Allowlist of trusted affiliate/shopping domains.
// AI-generated shopping links are restricted to these to prevent open redirect abuse.
const ALLOWED_AFFILIATE_DOMAINS = new Set([
  ...AMAZON_AFFILIATE_DOMAINS,
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

function withAmazonAffiliateTag(target: string): string {
  const associateTag = process.env.AMAZON_ASSOCIATE_TAG?.trim();
  if (!associateTag) {
    return target;
  }

  try {
    const targetUrl = new URL(target);
    const hostname = targetUrl.hostname.replace(/^www\./, "");

    if (!AMAZON_AFFILIATE_DOMAIN_SET.has(hostname)) {
      return target;
    }

    targetUrl.searchParams.set("tag", associateTag);
    return targetUrl.toString();
  } catch {
    return target;
  }
}

const querySchema = z.object({
  eventId: z.string().uuid(),
  itemId: z.string().uuid(),
  target: z.string().refine(isAllowedAffiliateUrl, "Redirect target is not an allowed affiliate domain."),
});

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const target = requestUrl.searchParams.get("target");
  const parsed = querySchema.safeParse({
    eventId: requestUrl.searchParams.get("eventId"),
    itemId: requestUrl.searchParams.get("itemId"),
    target,
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
  const redirectTarget = withAmazonAffiliateTag(parsed.data.target);
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
        target: redirectTarget,
        source: "shopping_recommendation_card",
      },
    }),
    createAuditLog(supabase, {
      action: "shopping_link_clicked",
      userId: user?.id ?? null,
      eventId: parsed.data.eventId,
      metadata: {
        item_id: parsed.data.itemId,
        target: redirectTarget,
        source: "shopping_recommendation_card",
      },
    }),
  ]);

  return NextResponse.redirect(redirectTarget, { status: 307 });
}
