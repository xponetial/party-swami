type InviteEmailArgs = {
  eventTitle: string;
  subtitle: string;
  dateText: string;
  locationText: string;
  inviteCopy: string;
  cardImageSrc: string | null;
  cardImageHref?: string | null;
  guestName: string;
  rsvpUrl: string;
};

export function buildInviteEmailSubject({ eventTitle }: { eventTitle: string }) {
  return `You're invited to ${eventTitle}`;
}

export function buildReminderEmailSubject({ eventTitle }: { eventTitle: string }) {
  return `Reminder: please RSVP for ${eventTitle}`;
}

function buildEventEmailHtml({
  eventTitle,
  subtitle,
  dateText,
  locationText,
  inviteCopy,
  cardImageSrc,
  cardImageHref,
  guestName,
  rsvpUrl,
  emailType,
}: InviteEmailArgs & { emailType: "invite" | "reminder" }) {
  const isReminder = emailType === "reminder";
  const eyebrow = isReminder ? "Party Swami Reminder" : "Party Swami Invitation";
  const introCopy = isReminder
    ? `Hi ${guestName}, just a quick reminder to RSVP for ${eventTitle}.`
    : `Hi ${guestName},`;
  const ctaCopy = isReminder
    ? "We'd love to help the host finalize seating, food, and celebration details. Please RSVP using your personal link below."
    : "Please RSVP using your personal link below so the host can finalize seating, food, and celebration details.";
  const footerCopy = isReminder
    ? "If you've already replied, thank you. Otherwise, you can RSVP directly with this link:"
    : "If the button doesn't work, open this link directly:";

  const cardImageMarkup = cardImageSrc
    ? `<div style="margin: 0 0 24px;">
          <a href="${cardImageHref || rsvpUrl}" style="display: block; text-decoration: none;">
            <img src="${cardImageSrc}" alt="${eventTitle} invitation card" style="display: block; width: 100%; max-width: 576px; border-radius: 24px; border: 1px solid rgba(112, 137, 255, 0.28);" />
          </a>
        </div>`
    : "";

  return `
    <div style="font-family: Arial, sans-serif; background: radial-gradient(circle at top right, rgba(37, 146, 255, 0.18), transparent 26%), radial-gradient(circle at top left, rgba(139, 70, 255, 0.22), transparent 24%), linear-gradient(180deg, #060a1e 0%, #0e1537 100%); padding: 32px; color: #eaf1ff;">
      <div style="max-width: 640px; margin: 0 auto; background: rgba(243, 247, 255, 0.98); border-radius: 28px; padding: 32px; border: 1px solid rgba(112, 137, 255, 0.2); box-shadow: 0 26px 70px rgba(5, 10, 35, 0.3);">
        <p style="font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; color: #6a63bf; margin: 0 0 12px;">${eyebrow}</p>
        ${cardImageMarkup}
        <h1 style="font-size: 32px; margin: 0 0 8px; color: #10193d;">${eventTitle}</h1>
        <p style="font-size: 15px; color: #62709d; margin: 0 0 20px;">${subtitle}</p>
        <p style="font-size: 16px; line-height: 1.7; margin: 0 0 24px; color: #24315f;">${introCopy}</p>
        <div style="background: linear-gradient(135deg, rgba(39, 147, 255, 0.12) 0%, rgba(139, 70, 255, 0.12) 100%); border-radius: 22px; padding: 22px 24px; margin: 0 0 24px; border: 1px solid rgba(112, 137, 255, 0.2);">
          <p style="margin: 0 0 14px; font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; color: #6a63bf; font-weight: 700;">Invitation Details</p>
          <p style="margin: 0 0 8px; font-size: 14px; line-height: 1.6; color: #24315f;"><strong>When:</strong> ${dateText}</p>
          <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #24315f;"><strong>Where:</strong> ${locationText}</p>
        </div>
        <p style="font-size: 16px; line-height: 1.8; margin: 0 0 24px; color: #18234f;">${inviteCopy}</p>
        <div style="background: rgba(237, 243, 255, 0.95); border-radius: 18px; padding: 18px 20px; margin: 0 0 24px; border: 1px solid rgba(112, 137, 255, 0.16);">
          <p style="margin: 0; font-size: 14px; line-height: 1.7; color: #31437b;">
            ${ctaCopy}
          </p>
        </div>
        <a href="${rsvpUrl}" style="display: inline-block; background: linear-gradient(135deg, #2592ff 0%, #8b46ff 100%); color: #ffffff; text-decoration: none; padding: 14px 22px; border-radius: 999px; font-weight: 600; box-shadow: 0 16px 30px rgba(46, 98, 255, 0.28);">
          RSVP now
        </a>
        <p style="margin: 24px 0 0; font-size: 13px; color: #62709d;">${footerCopy} ${rsvpUrl}</p>
        <p style="margin: 20px 0 0; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: #8d97ba;">Party Swami</p>
      </div>
    </div>
  `.trim();
}

export function buildInviteEmailHtml(args: InviteEmailArgs) {
  return buildEventEmailHtml({ ...args, emailType: "invite" });
}

export function buildReminderEmailHtml(args: InviteEmailArgs) {
  return buildEventEmailHtml({ ...args, emailType: "reminder" });
}
