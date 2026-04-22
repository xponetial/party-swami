import "server-only";

import { CONTACT_EMAILS } from "@/lib/contact-email";
import { getResendClient, getResendFromEmail } from "@/lib/email/resend";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type MarketplaceLeadEmailInput = {
  leadId: string;
  providerType: "vendor" | "planner";
  providerName: string;
  providerEmail: string;
  hostName: string;
  hostEmail: string;
  eventType: string | null;
  eventZipCode: string | null;
  message: string;
  packageTitle?: string | null;
};

function buildText(input: MarketplaceLeadEmailInput, audience: "admin" | "provider" | "host") {
  const lines = [
    audience === "host"
      ? `Your Party Swami request to ${input.providerName} was recorded.`
      : `New Party Swami marketplace lead for ${input.providerName}.`,
    "",
    `Host: ${input.hostName} <${input.hostEmail}>`,
    `Provider: ${input.providerName}`,
    `Type: ${input.providerType}`,
    `Event: ${input.eventType ?? "Event TBD"}`,
    `ZIP: ${input.eventZipCode ?? "ZIP TBD"}`,
  ];

  if (input.packageTitle) {
    lines.push(`Package: ${input.packageTitle}`);
  }

  lines.push("", "Message:", input.message);

  if (audience === "host") {
    lines.push("", "The provider handles quotes, contracts, payment, refunds, and service delivery.");
  }

  return lines.join("\n");
}

async function recordNotification(input: {
  leadId: string;
  recipientType: "admin" | "provider" | "host";
  recipientEmail: string;
  subject: string;
  providerType: "vendor" | "planner";
  providerName: string;
  status: "sent" | "skipped" | "failed";
  errorMessage?: string | null;
}) {
  const supabase = createSupabaseAdminClient();
  await supabase.from("marketplace_notifications").insert({
    lead_id: input.leadId,
    recipient_type: input.recipientType,
    recipient_email: input.recipientEmail,
    subject: input.subject,
    provider_type: input.providerType,
    provider_name: input.providerName,
    status: input.status,
    error_message: input.errorMessage ?? null,
    sent_at: input.status === "sent" ? new Date().toISOString() : null,
  });
}

async function sendOrRecord(input: {
  lead: MarketplaceLeadEmailInput;
  recipientType: "admin" | "provider" | "host";
  to: string;
  subject: string;
  text: string;
}) {
  const resend = getResendClient();

  if (!resend) {
    await recordNotification({
      leadId: input.lead.leadId,
      recipientType: input.recipientType,
      recipientEmail: input.to,
      subject: input.subject,
      providerType: input.lead.providerType,
      providerName: input.lead.providerName,
      status: "skipped",
      errorMessage: "RESEND_API_KEY is not configured.",
    });
    return;
  }

  try {
    await resend.emails.send({
      from: getResendFromEmail(),
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
    await recordNotification({
      leadId: input.lead.leadId,
      recipientType: input.recipientType,
      recipientEmail: input.to,
      subject: input.subject,
      providerType: input.lead.providerType,
      providerName: input.lead.providerName,
      status: "sent",
    });
  } catch (error) {
    await recordNotification({
      leadId: input.lead.leadId,
      recipientType: input.recipientType,
      recipientEmail: input.to,
      subject: input.subject,
      providerType: input.lead.providerType,
      providerName: input.lead.providerName,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Email failed.",
    });
  }
}

export async function notifyMarketplaceLead(input: MarketplaceLeadEmailInput) {
  const subject = `Party Swami lead: ${input.providerName}`;
  const hostSubject = `Party Swami request sent to ${input.providerName}`;

  await Promise.all([
    sendOrRecord({
      lead: input,
      recipientType: "admin",
      to: process.env.MARKETPLACE_ADMIN_EMAIL?.trim() || CONTACT_EMAILS.admin,
      subject,
      text: buildText(input, "admin"),
    }),
    sendOrRecord({
      lead: input,
      recipientType: "provider",
      to: input.providerEmail,
      subject,
      text: buildText(input, "provider"),
    }),
    sendOrRecord({
      lead: input,
      recipientType: "host",
      to: input.hostEmail,
      subject: hostSubject,
      text: buildText(input, "host"),
    }),
  ]);
}
