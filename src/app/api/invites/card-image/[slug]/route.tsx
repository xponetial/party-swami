import { notFound } from "next/navigation";
import { type InviteDesignData } from "@/lib/invite-design";
import { createInviteCardImagePng } from "@/lib/invite-card-image";
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
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: inviteRows, error } = await supabase.rpc("get_public_invite_by_slug", {
    p_slug: slug,
  });

  if (error || !inviteRows?.length) {
    notFound();
  }

  const invite = inviteRows[0] as PublicInviteRecord;
  const png = await createInviteCardImagePng(invite);

  return new Response(new Uint8Array(png), {
    headers: {
      "cache-control": "public, max-age=300, stale-while-revalidate=86400",
      "content-type": "image/png",
    },
  });
}
