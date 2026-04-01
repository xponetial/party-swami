import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { buildInviteEmailHtml, buildInviteEmailSubject } from "@/lib/email/invite-template";
import { getInviteFromEmail, getResendClient } from "@/lib/email/resend";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  eventId: z.string().uuid(),
});

type GuestInviteRecord = {
  id: string;
  name: string;
  email: string | null;
  rsvp_token: string;
};

function buildBaseUrl(originHeader: string | null) {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || originHeader || "http://localhost:3000";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: parsed.error.issues[0]?.message ?? "Invalid invite send payload.",
      },
      { status: 400 },
    );
  }

  const resend = getResendClient();

  if (!resend) {
    return NextResponse.json(
      {
        ok: false,
        message: "RESEND_API_KEY is not configured on the server yet.",
      },
      { status: 500 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "You must be signed in." }, { status: 401 });
  }

  const eventId = parsed.data.eventId;
  const [{ data: event, error: eventError }, { data: invite }, { data: guestsData }] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, event_type, event_date, location")
      .eq("id", eventId)
      .single<{ id: string; title: string; event_type: string; event_date: string | null; location: string | null }>(),
    supabase
      .from("invites")
      .select("id, invite_copy, public_slug, is_public")
      .eq("event_id", eventId)
      .maybeSingle<{ id: string; invite_copy: string | null; public_slug: string; is_public: boolean }>(),
    supabase
      .from("guests")
      .select("id, name, email, rsvp_token")
      .eq("event_id", eventId)
      .returns<GuestInviteRecord[]>(),
  ]);
  const guests = guestsData ?? [];

  if (eventError || !event) {
    return NextResponse.json({ ok: false, message: eventError?.message ?? "Event not found." }, { status: 404 });
  }

  if (!invite) {
    return NextResponse.json({ ok: false, message: "No invite exists for this event yet." }, { status: 400 });
  }

  if (!invite.is_public) {
    return NextResponse.json(
      {
        ok: false,
        message: "Enable the public RSVP link before sending invite emails.",
      },
      { status: 400 },
    );
  }

  const emailableGuests = guests.filter((guest) => Boolean(guest.email));

  if (!emailableGuests.length) {
    return NextResponse.json(
      {
        ok: false,
        message: "Add at least one guest with an email address before sending invites.",
      },
      { status: 400 },
    );
  }

  const headerStore = await headers();
  const baseUrl = buildBaseUrl(headerStore.get("origin"));
  const from = getInviteFromEmail();
  const inviteCopy = invite.invite_copy ?? `You're invited to ${event.title}.`;

  const sendResults = await Promise.all(
    emailableGuests.map(async (guest) => {
      const rsvpUrl = `${baseUrl}/rsvp/${invite.public_slug}?guest=${encodeURIComponent(guest.rsvp_token)}`;
      const subject = buildInviteEmailSubject({ eventTitle: event.title });
      const html = buildInviteEmailHtml({
        eventTitle: event.title,
        eventType: event.event_type,
        eventDate: event.event_date,
        location: event.location,
        inviteCopy,
        guestName: guest.name,
        rsvpUrl,
      });

      const { data, error } = await resend.emails.send({
        from,
        to: guest.email!,
        subject,
        html,
      });

      return {
        guest,
        html,
        rsvpUrl,
        resendId: data?.id ?? null,
        error,
      };
    }),
  );

  const successfulSends = sendResults.filter((result) => !result.error);
  const failedSends = sendResults.filter((result) => result.error);

  if (!successfulSends.length) {
    return NextResponse.json(
      {
        ok: false,
        message: failedSends[0]?.error?.message ?? "All invite sends failed.",
      },
      { status: 502 },
    );
  }

  const sentAt = new Date().toISOString();

  await Promise.all([
    supabase.from("guest_messages").insert(
      successfulSends.map((result) => ({
        event_id: eventId,
        guest_id: result.guest.id,
        channel: "email",
        message_type: "invite",
        subject: buildInviteEmailSubject({ eventTitle: event.title }),
        body: inviteCopy,
        sent_at: sentAt,
        metadata: {
          resend_id: result.resendId,
          rsvp_url: result.rsvpUrl,
        },
      })),
    ),
    Promise.all(
      successfulSends.map((result) =>
        supabase
          .from("guests")
          .update({ last_contacted_at: sentAt })
          .eq("id", result.guest.id),
      ),
    ),
    supabase.from("invites").update({ sent_at: sentAt }).eq("id", invite.id),
  ]);

  return NextResponse.json({
    ok: true,
    summary: {
      sentCount: successfulSends.length,
      skippedCount: guests.length - emailableGuests.length,
      failedCount: failedSends.length,
    },
  });
}
