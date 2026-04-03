import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import {
  buildInviteEmailHtml,
  buildInviteEmailSubject,
  buildReminderEmailHtml,
  buildReminderEmailSubject,
} from "@/lib/email/invite-template";
import { normalizeInviteDesignData, type InviteDesignData } from "@/lib/invite-design";
import { getInviteFromEmail, getResendClient } from "@/lib/email/resend";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAuditLog, trackAnalyticsEvent } from "@/lib/telemetry";

const bodySchema = z.object({
  eventId: z.string().uuid(),
  deliveryType: z.enum(["invite", "reminder"]).default("invite"),
  sendMode: z.enum(["pending_only", "all"]).optional(),
});

type GuestInviteRecord = {
  id: string;
  name: string;
  email: string | null;
  rsvp_token: string;
  last_contacted_at: string | null;
  status: "pending" | "confirmed" | "declined";
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

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "You must be signed in." }, { status: 401 });
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

  const eventId = parsed.data.eventId;
  const deliveryType = parsed.data.deliveryType;
  const sendMode =
    deliveryType === "reminder" ? "pending_rsvp" : (parsed.data.sendMode ?? "pending_only");
  const [{ data: event, error: eventError }, { data: invite }, { data: guestsData }] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, event_type, event_date, location")
      .eq("id", eventId)
      .single<{ id: string; title: string; event_type: string; event_date: string | null; location: string | null }>(),
    supabase
      .from("invites")
      .select("id, design_json, invite_copy, public_slug, is_public")
      .eq("event_id", eventId)
      .maybeSingle<{
        id: string;
        design_json: InviteDesignData | null;
        invite_copy: string | null;
        public_slug: string;
        is_public: boolean;
      }>(),
    supabase
      .from("guests")
      .select("id, name, email, rsvp_token, last_contacted_at, status")
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
  const sendableGuests =
    deliveryType === "reminder"
      ? emailableGuests.filter((guest) => guest.status === "pending" && guest.last_contacted_at)
      : sendMode === "all"
        ? emailableGuests
        : emailableGuests.filter((guest) => !guest.last_contacted_at);

  if (!emailableGuests.length) {
    return NextResponse.json(
      {
        ok: false,
        message: "Add at least one guest with an email address before sending invites.",
      },
      { status: 400 },
    );
  }

  if (!sendableGuests.length) {
    return NextResponse.json(
      {
        ok: false,
        message:
          deliveryType === "reminder"
            ? "There are no pending guests who have already been contacted. Send invites first or wait for new RSVP activity."
            : sendMode === "all"
              ? "There are no emailable guests for this event."
              : "All emailable guests have already been contacted. Use resend all to send again.",
      },
      { status: 400 },
    );
  }

  const headerStore = await headers();
  const baseUrl = buildBaseUrl(headerStore.get("origin"));
  const from = getInviteFromEmail();
  const fallbackDesign: InviteDesignData = {
    templateId: "email-fallback-template",
    packSlug: "email-fallback-pack",
    categoryKey: event.event_type.trim().toLowerCase(),
    categoryLabel: event.event_type,
    fields: {
      title: event.title,
      subtitle: event.event_type,
      dateText: event.event_date
        ? new Intl.DateTimeFormat("en-US", {
            dateStyle: "full",
            timeStyle: "short",
          }).format(new Date(event.event_date))
        : "Date coming soon",
      locationText: event.location ?? "Location coming soon",
      messageText: invite.invite_copy ?? `You're invited to ${event.title}.`,
      ctaText: "RSVP with your private link",
    },
  };
  const inviteDesign = invite.design_json
    ? normalizeInviteDesignData(invite.design_json, fallbackDesign)
    : fallbackDesign;
  const inviteCopy = inviteDesign.fields.messageText;
  const cardImageUrl = `${baseUrl}/api/invites/card-image/${invite.public_slug}`;

  const sendResults = await Promise.all(
    sendableGuests.map(async (guest) => {
      const rsvpUrl = `${baseUrl}/rsvp/${invite.public_slug}?guest=${encodeURIComponent(guest.rsvp_token)}`;
      const subject =
        deliveryType === "reminder"
          ? buildReminderEmailSubject({ eventTitle: event.title })
          : buildInviteEmailSubject({ eventTitle: event.title });
      const emailArgs = {
        eventTitle: inviteDesign.fields.title,
        subtitle: inviteDesign.fields.subtitle,
        dateText: inviteDesign.fields.dateText,
        locationText: inviteDesign.fields.locationText,
        inviteCopy,
        cardImageSrc: cardImageUrl,
        cardImageHref: rsvpUrl,
        guestName: guest.name,
        rsvpUrl,
      };
      const html =
        deliveryType === "reminder"
          ? buildReminderEmailHtml(emailArgs)
          : buildInviteEmailHtml(emailArgs);

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
        message_type: deliveryType === "reminder" ? "reminder" : "invite",
        subject:
          deliveryType === "reminder"
            ? buildReminderEmailSubject({ eventTitle: event.title })
            : buildInviteEmailSubject({ eventTitle: event.title }),
        body: inviteCopy,
        sent_at: sentAt,
        metadata: {
          resend_id: result.resendId,
          rsvp_url: result.rsvpUrl,
          send_mode: sendMode,
          delivery_type: deliveryType,
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
    deliveryType === "invite"
      ? supabase.from("invites").update({ sent_at: sentAt }).eq("id", invite.id)
      : Promise.resolve({ error: null }),
  ]);

  if (deliveryType === "invite") {
    await Promise.all([
      trackAnalyticsEvent(supabase, {
        eventName: "invite_sent",
        userId: user.id,
        eventId,
        metadata: {
          send_mode: sendMode,
          sent_count: successfulSends.length,
          failed_count: failedSends.length,
        },
      }),
      createAuditLog(supabase, {
        action: "invite_sent",
        userId: user.id,
        eventId,
        metadata: {
          invite_id: invite.id,
          send_mode: sendMode,
          sent_count: successfulSends.length,
          failed_count: failedSends.length,
        },
      }),
    ]);
  } else {
    await createAuditLog(supabase, {
      action: "invite_reminder_sent",
      userId: user.id,
      eventId,
      metadata: {
        invite_id: invite.id,
        sent_count: successfulSends.length,
        failed_count: failedSends.length,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    summary: {
      sentCount: successfulSends.length,
      skippedCount: guests.length - sendableGuests.length,
      failedCount: failedSends.length,
      sendMode,
      deliveryType,
    },
  });
}
