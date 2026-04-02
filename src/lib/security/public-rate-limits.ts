import { consumeRateLimit, getClientIpFromHeaders } from "@/lib/security/rate-limit";

const PUBLIC_RSVP_LIMIT = 10;
const PUBLIC_RSVP_WINDOW_MS = 15 * 60 * 1000;

export function checkPublicRsvpRateLimit(headers: Pick<Headers, "get">, slug?: string | null) {
  const clientIp = getClientIpFromHeaders(headers);
  const scope = slug?.trim() ? `${clientIp}:${slug.trim().toLowerCase()}` : clientIp;

  return consumeRateLimit({
    bucket: "public-rsvp",
    key: scope,
    limit: PUBLIC_RSVP_LIMIT,
    windowMs: PUBLIC_RSVP_WINDOW_MS,
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
