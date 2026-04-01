type InviteEmailArgs = {
  eventTitle: string;
  eventType: string;
  eventDate: string | null;
  location: string | null;
  inviteCopy: string;
  guestName: string;
  rsvpUrl: string;
};

function formatEventDate(eventDate: string | null) {
  if (!eventDate) {
    return "Date coming soon";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(eventDate));
}

export function buildInviteEmailSubject({ eventTitle }: { eventTitle: string }) {
  return `You're invited to ${eventTitle}`;
}

export function buildInviteEmailHtml({
  eventTitle,
  eventType,
  eventDate,
  location,
  inviteCopy,
  guestName,
  rsvpUrl,
}: InviteEmailArgs) {
  const formattedDate = formatEventDate(eventDate);

  return `
    <div style="font-family: Arial, sans-serif; background: #f7f1e8; padding: 32px; color: #302417;">
      <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 24px; padding: 32px; border: 1px solid #eadfce;">
        <p style="font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #8a6d57; margin: 0 0 12px;">PartyGenie Invitation</p>
        <h1 style="font-size: 32px; margin: 0 0 8px;">${eventTitle}</h1>
        <p style="font-size: 15px; color: #6e5744; margin: 0 0 20px;">${eventType}</p>
        <p style="font-size: 16px; line-height: 1.7; margin: 0 0 24px;">Hi ${guestName},</p>
        <p style="font-size: 16px; line-height: 1.8; margin: 0 0 24px;">${inviteCopy}</p>
        <div style="background: #fff7ec; border-radius: 18px; padding: 18px 20px; margin: 0 0 24px;">
          <p style="margin: 0 0 8px; font-size: 14px;"><strong>When:</strong> ${formattedDate}</p>
          <p style="margin: 0; font-size: 14px;"><strong>Where:</strong> ${location ?? "Location coming soon"}</p>
        </div>
        <a href="${rsvpUrl}" style="display: inline-block; background: #c96b3d; color: #ffffff; text-decoration: none; padding: 14px 22px; border-radius: 999px; font-weight: 600;">
          RSVP now
        </a>
        <p style="margin: 24px 0 0; font-size: 13px; color: #7a6a5a;">If the button doesn't work, open this link directly: ${rsvpUrl}</p>
      </div>
    </div>
  `.trim();
}
