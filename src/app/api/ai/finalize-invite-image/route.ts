import { NextResponse } from "next/server";
import { z } from "zod";
import { isFeatureFlagEnabled } from "@/lib/feature-flags";
import { normalizeInviteDesignData } from "@/lib/invite-design";
import { finalizeInviteGeneratedImageFromSource } from "@/lib/invite-preview-storage";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  eventId: z.string().uuid(),
  inviteId: z.string().uuid(),
  sourcePath: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid finalize payload." },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "You must be signed in." }, { status: 401 });
  }

  const [{ data: profile }, uploadEditingEnabled] = await Promise.all([
    supabase
      .from("profiles")
      .select("plan_tier")
      .eq("id", user.id)
      .maybeSingle<{ plan_tier: string | null }>(),
    isFeatureFlagEnabled("upload_editing", { userId: user.id, fallbackEnabled: false }),
  ]);
  const isPaidPlan = profile?.plan_tier === "pro" || profile?.plan_tier === "admin";

  if (!isPaidPlan || !uploadEditingEnabled) {
    return NextResponse.json(
      { ok: false, message: "Image finalization is available on Pro and Admin plans." },
      { status: 403 },
    );
  }

  const expectedPrefix = `user-assets/${user.id}/${parsed.data.eventId}/`;

  if (!parsed.data.sourcePath.startsWith(expectedPrefix)) {
    return NextResponse.json(
      { ok: false, message: "Selected image is invalid for this account." },
      { status: 403 },
    );
  }

  const [{ data: ownedEvent }, { data: inviteRow }] = await Promise.all([
    supabase
      .from("events")
      .select("id")
      .eq("id", parsed.data.eventId)
      .eq("owner_id", user.id)
      .maybeSingle<{ id: string }>(),
    supabase
      .from("invites")
      .select("id, design_json")
      .eq("id", parsed.data.inviteId)
      .eq("event_id", parsed.data.eventId)
      .maybeSingle<{ id: string; design_json: unknown }>(),
  ]);

  if (!ownedEvent || !inviteRow) {
    return NextResponse.json({ ok: false, message: "Invite not found." }, { status: 404 });
  }

  try {
    const finalized = await finalizeInviteGeneratedImageFromSource({
      userId: user.id,
      eventId: parsed.data.eventId,
      inviteId: parsed.data.inviteId,
      sourcePath: parsed.data.sourcePath,
    });

    const fallback = {
      templateId: "default-template",
      packSlug: "default-pack",
      categoryKey: "general",
      categoryLabel: "General",
      fields: {
        title: "Party Swami Invite",
        subtitle: "Celebration",
        dateText: "Date coming soon",
        locationText: "Location coming soon",
        messageText: "You're invited.",
        ctaText: "RSVP now",
        backgroundImageUrl: null,
        backgroundImagePath: null,
      },
    };
    const normalized = normalizeInviteDesignData(inviteRow.design_json, fallback);
    const nextDesign = {
      ...normalized,
      fields: {
        ...normalized.fields,
        backgroundImageUrl: finalized.highResUrl,
        backgroundImagePath: finalized.highResPath,
      },
    };

    await supabase
      .from("invites")
      .update({ design_json: nextDesign })
      .eq("id", parsed.data.inviteId)
      .eq("event_id", parsed.data.eventId);

    return NextResponse.json({
      ok: true,
      imageUrl: finalized.highResUrl,
      message: "Selected image finalized and applied.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not finalize selected image.";
    console.error("Finalize invite image failed", {
      userId: user.id,
      eventId: parsed.data.eventId,
      inviteId: parsed.data.inviteId,
      message,
    });
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
