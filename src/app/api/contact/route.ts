import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildContactFormDefaults } from "@/lib/contact-form";
import { ContactContext, ContactFormCategory, getContactEmail } from "@/lib/contact-email";
import { getResendClient, getResendFromEmail } from "@/lib/email/resend";
import { buildRateLimitHeaders, checkContactRateLimit } from "@/lib/security/public-rate-limits";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAuditLog, trackAnalyticsEvent } from "@/lib/telemetry";

const contactPayloadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(320),
  category: z.enum(["general", "support", "bug", "feature", "info", "sales"]),
  subject: z.string().trim().min(1).max(160),
  message: z.string().trim().min(10).max(5000),
  context: z.enum(["marketing", "pricing", "support", "dashboard", "invites", "ai", "admin"]).optional().or(z.literal("")),
  pageLabel: z.string().trim().max(120).optional().or(z.literal("")),
  pagePath: z.string().trim().max(400).optional().or(z.literal("")),
  pageUrl: z.string().trim().max(1000).optional().or(z.literal("")),
  turnstileToken: z.string().trim().min(1),
});

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function verifyTurnstileToken({
  token,
  remoteIp,
}: {
  token: string;
  remoteIp: string | null;
}) {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    throw new Error("Missing TURNSTILE_SECRET_KEY environment variable.");
  }

  const body = new URLSearchParams({
    secret,
    response: token,
  });

  if (remoteIp) {
    body.set("remoteip", remoteIp);
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    throw new Error("Turnstile verification request failed.");
  }

  const result = (await response.json()) as {
    success: boolean;
    "error-codes"?: string[];
  };

  return result;
}

export async function POST(request: NextRequest) {
  const rateLimit = await checkContactRateLimit(request.headers);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many submissions. Please wait a few minutes and try again." },
      { status: 429, headers: buildRateLimitHeaders(rateLimit) },
    );
  }

  const payloadResult = contactPayloadSchema.safeParse(await request.json());

  if (!payloadResult.success) {
    return NextResponse.json(
      { error: "Please complete every required field before submitting." },
      { status: 400 },
    );
  }

  const payload = payloadResult.data;
  const context = payload.context || undefined;
  const defaults = buildContactFormDefaults({
    category: payload.category as ContactFormCategory,
    context: context as ContactContext | undefined,
    pageLabel: payload.pageLabel || undefined,
    pagePath: payload.pagePath || undefined,
    pageUrl: payload.pageUrl || undefined,
  });
  const remoteIp = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for");

  try {
    const turnstile = await verifyTurnstileToken({
      token: payload.turnstileToken,
      remoteIp: remoteIp ? remoteIp.split(",")[0]?.trim() ?? null : null,
    });

    if (!turnstile.success) {
      console.warn("Contact form Turnstile verification rejected", {
        category: payload.category,
        context: defaults.context,
        hostname: request.nextUrl.hostname,
        errorCodes: turnstile["error-codes"] ?? [],
      });
      return NextResponse.json(
        { error: "Turnstile could not verify this submission. Please try again." },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Turnstile verification failed", error);
    return NextResponse.json(
      { error: "Contact verification is unavailable right now. Please try again." },
      { status: 503 },
    );
  }

  const resend = getResendClient();

  if (!resend) {
    return NextResponse.json(
      { error: "Email delivery is not configured right now. Please try again later." },
      { status: 503 },
    );
  }

  const submittedAt = new Date().toISOString();
  const destination = getContactEmail(defaults.emailKey);
  const text = [
    `New Party Swami contact submission`,
    ``,
    `Category: ${payload.category}`,
    `Intent: ${defaults.intent}`,
    `Inbox: ${destination}`,
    `Context: ${defaults.context}`,
    `Submitted: ${submittedAt}`,
    `From: ${payload.name} <${payload.email}>`,
    payload.pageLabel ? `Page: ${payload.pageLabel}` : null,
    payload.pagePath ? `Path: ${payload.pagePath}` : null,
    payload.pageUrl ? `URL: ${payload.pageUrl}` : null,
    ``,
    `Subject`,
    payload.subject,
    ``,
    `Message`,
    payload.message,
  ]
    .filter(Boolean)
    .join("\n");

  const htmlSections = [
    `<p><strong>New Party Swami contact submission</strong></p>`,
    `<ul>`,
    `<li><strong>Category:</strong> ${escapeHtml(payload.category)}</li>`,
    `<li><strong>Intent:</strong> ${escapeHtml(defaults.intent)}</li>`,
    `<li><strong>Inbox:</strong> ${escapeHtml(destination)}</li>`,
    `<li><strong>Context:</strong> ${escapeHtml(defaults.context)}</li>`,
    `<li><strong>Submitted:</strong> ${escapeHtml(submittedAt)}</li>`,
    `<li><strong>From:</strong> ${escapeHtml(payload.name)} &lt;${escapeHtml(payload.email)}&gt;</li>`,
    payload.pageLabel ? `<li><strong>Page:</strong> ${escapeHtml(payload.pageLabel)}</li>` : "",
    payload.pagePath ? `<li><strong>Path:</strong> ${escapeHtml(payload.pagePath)}</li>` : "",
    payload.pageUrl ? `<li><strong>URL:</strong> ${escapeHtml(payload.pageUrl)}</li>` : "",
    `</ul>`,
    `<p><strong>Subject</strong><br />${escapeHtml(payload.subject)}</p>`,
    `<p><strong>Message</strong><br />${escapeHtml(payload.message).replaceAll("\n", "<br />")}</p>`,
  ];

  const { data, error } = await resend.emails.send({
    from: getResendFromEmail(),
    to: destination,
    replyTo: payload.email,
    subject: `[${payload.category.toUpperCase()}] ${payload.subject}`,
    text,
    html: htmlSections.join(""),
    tags: [
      { name: "source", value: "contact_form" },
      { name: "category", value: payload.category },
      { name: "context", value: defaults.context },
    ],
  });

  if (error) {
    console.error("Failed to send contact submission", {
      destination,
      category: payload.category,
      context: defaults.context,
      resendError: error,
    });
    return NextResponse.json(
      { error: "We could not send your message right now. Please try again." },
      { status: 502 },
    );
  }

  console.info("Contact submission accepted by Resend", {
    destination,
    category: payload.category,
    context: defaults.context,
    resendMessageId: data?.id ?? null,
    replyTo: payload.email,
  });

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await Promise.all([
        trackAnalyticsEvent(supabase, {
          eventName: "feedback_submitted",
          userId: user.id,
          metadata: {
            category: payload.category,
            context: defaults.context,
            pagePath: payload.pagePath || null,
          },
        }),
        createAuditLog(supabase, {
          action: "contact_feedback_submitted",
          userId: user.id,
          metadata: {
            category: payload.category,
            subject: payload.subject,
            pagePath: payload.pagePath || null,
          },
        }),
      ]);
    }
  } catch (error) {
    console.error("Failed to record contact submission telemetry", error);
  }

  return NextResponse.json({
    success: `Thanks, ${payload.name.split(" ")[0] ?? payload.name}. Your message was routed to ${destination}.`,
  });
}
