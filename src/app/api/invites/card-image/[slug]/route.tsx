import sharp from "sharp";
import { notFound } from "next/navigation";
import { type InviteDesignData } from "@/lib/invite-design";
import { createInviteCardImagePng } from "@/lib/invite-card-image";
import { isFeatureFlagEnabled } from "@/lib/feature-flags";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type PublicInviteRecord = {
  event_id: string;
  title: string;
  event_type: string;
  event_date: string | null;
  location: string | null;
  theme: string | null;
  invite_copy: string | null;
  design_json: InviteDesignData | null;
  public_slug: string;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const shouldDownload = searchParams.get("download") === "1";
  const preset = searchParams.get("preset") === "low" ? "low" : searchParams.get("preset") === "print" ? "print" : "high";
  const supabase = await createSupabaseServerClient();
  const { data: inviteRows, error } = await supabase.rpc("get_public_invite_by_slug", {
    p_slug: slug,
  });

  if (error || !inviteRows?.length) {
    notFound();
  }

  const invite = inviteRows[0] as PublicInviteRecord;

  if (shouldDownload) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ ok: false, message: "Authentication required." }, { status: 401 });
    }

    const [{ data: ownedEvent }, { data: profile }] = await Promise.all([
      supabase
        .from("events")
        .select("id")
        .eq("id", invite.event_id)
        .eq("owner_id", user.id)
        .maybeSingle<{ id: string }>(),
      supabase
        .from("profiles")
        .select("plan_tier")
        .eq("id", user.id)
        .maybeSingle<{ plan_tier: string | null }>(),
    ]);

    const isPaidPlan = profile?.plan_tier === "pro" || profile?.plan_tier === "admin";

    if (!ownedEvent) {
      return Response.json(
        { ok: false, message: "This invite is not available for your account." },
        { status: 403 },
      );
    }

    if (preset === "high") {
      const highResEnabled = await isFeatureFlagEnabled("high_res_download", {
        userId: user.id,
        fallbackEnabled: false,
      });

      if (!isPaidPlan || !highResEnabled) {
        return Response.json(
          { ok: false, message: "High-res downloads are available on Pro and Admin plans." },
          { status: 403 },
        );
      }
    }

    if (preset === "print") {
      const printingEnabled = await isFeatureFlagEnabled("printing", {
        userId: user.id,
        fallbackEnabled: false,
      });

      if (!isPaidPlan || !printingEnabled) {
        return Response.json(
          { ok: false, message: "Print-ready export is not enabled for this workspace yet." },
          { status: 403 },
        );
      }
    }
  }

  let png = await createInviteCardImagePng(invite);

  if (preset === "low") {
    png = await sharp(png)
      .resize(400, 600, { fit: "cover" })
      .png()
      .toBuffer();
  }

  if (preset === "print") {
    png = await sharp(png)
      .resize(1600, 2400, { fit: "cover" })
      .png()
      .toBuffer();
  }

  const headers = new Headers({
    "cache-control": "public, max-age=300, stale-while-revalidate=86400",
    "content-type": "image/png",
  });

  if (shouldDownload) {
    const suffix = preset === "low" ? "low-res" : preset === "print" ? "print-ready" : "high-res";
    headers.set(
      "content-disposition",
      `attachment; filename="party-swami-invite-${slug}-${suffix}.png"`,
    );
  }

  return new Response(new Uint8Array(png), { headers });
}
