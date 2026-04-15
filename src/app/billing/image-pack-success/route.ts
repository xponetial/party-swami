import { NextResponse } from "next/server";
import { grantImagePackAllowanceFromCheckoutSession } from "@/lib/billing/image-pack";
import { getStripeClient } from "@/lib/billing/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const stripe = getStripeClient();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const requestUrl = new URL(request.url);
  const sessionId = requestUrl.searchParams.get("session_id");
  const redirectUrl = new URL("/billing?billing=image_pack_success", requestUrl.origin);

  if (!stripe || !user || !sessionId) {
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    });
    const metadataUserId = session.metadata?.supabase_user_id ?? null;

    if (metadataUserId && metadataUserId !== user.id) {
      return NextResponse.redirect(redirectUrl);
    }

    await grantImagePackAllowanceFromCheckoutSession({ stripe, session });
  } catch (error) {
    console.error("Image pack success sync failed", {
      userId: user.id,
      sessionId,
      message: error instanceof Error ? error.message : "unknown",
    });
  }

  return NextResponse.redirect(redirectUrl);
}
