import { consumeRateLimit, getClientIpFromHeaders } from "@/lib/security/rate-limit";

const PUBLIC_RSVP_LIMIT = 10;
const PUBLIC_RSVP_WINDOW_MS = 15 * 60 * 1000;

const CONTACT_LIMIT = 5;
const CONTACT_WINDOW_MS = 10 * 60 * 1000;

export async function checkPublicRsvpRateLimit(headers: Pick<Headers, "get">, slug?: string | null) {
  const clientIp = getClientIpFromHeaders(headers);
  const scope = slug?.trim() ? `${clientIp}:${slug.trim().toLowerCase()}` : clientIp;

  return consumeRateLimit({
    bucket: "public-rsvp",
    key: scope,
    limit: PUBLIC_RSVP_LIMIT,
    windowMs: PUBLIC_RSVP_WINDOW_MS,
  });
}

export async function checkContactRateLimit(headers: Pick<Headers, "get">) {
  const clientIp = getClientIpFromHeaders(headers);

  return consumeRateLimit({
    bucket: "contact",
    key: clientIp,
    limit: CONTACT_LIMIT,
    windowMs: CONTACT_WINDOW_MS,
  });
}

export function buildRateLimitHeaders(result: {
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}) {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.floor(result.resetAt / 1000)),
    "Retry-After": String(result.retryAfterSeconds),
  };
}
