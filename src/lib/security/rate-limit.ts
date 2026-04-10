import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// In-memory fallback — only reliable for single-instance dev environments.
// In serverless/multi-instance production, configure UPSTASH_REDIS_REST_URL
// and UPSTASH_REDIS_REST_TOKEN to get distributed rate limiting.
const WINDOW_STATE = new Map<string, { count: number; resetAt: number }>();

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

function normalizeClientIp(value: string | null) {
  if (!value) {
    return "unknown";
  }

  const first = value
    .split(",")
    .map((item) => item.trim())
    .find(Boolean);

  return first || "unknown";
}

export function getClientIpFromHeaders(headers: Pick<Headers, "get">) {
  return normalizeClientIp(
    headers.get("x-forwarded-for") ||
      headers.get("cf-connecting-ip") ||
      headers.get("x-real-ip"),
  );
}

function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    return null;
  }

  try {
    return new Redis({ url, token });
  } catch {
    return null;
  }
}

function msToDuration(ms: number): `${number} s` | `${number} m` | `${number} h` {
  const seconds = Math.ceil(ms / 1000);
  if (seconds % 3600 === 0) return `${seconds / 3600} h`;
  if (seconds % 60 === 0) return `${seconds / 60} m`;
  return `${seconds} s`;
}

function consumeInMemory({
  bucket,
  key,
  limit,
  windowMs,
  now = Date.now(),
}: {
  bucket: string;
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
}): RateLimitResult {
  if (WINDOW_STATE.size >= 500) {
    for (const [entryKey, entry] of WINDOW_STATE.entries()) {
      if (entry.resetAt <= now) {
        WINDOW_STATE.delete(entryKey);
      }
    }
  }

  const bucketKey = `${bucket}:${key}`;
  const existing = WINDOW_STATE.get(bucketKey);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    WINDOW_STATE.set(bucketKey, { count: 1, resetAt });
    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - 1),
      resetAt,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  WINDOW_STATE.set(bucketKey, existing);

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

export async function consumeRateLimit({
  bucket,
  key,
  limit,
  windowMs,
}: {
  bucket: string;
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  const redis = getRedisClient();

  if (!redis) {
    return consumeInMemory({ bucket, key, limit, windowMs });
  }

  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, msToDuration(windowMs)),
    prefix: `rate:${bucket}`,
  });

  const now = Date.now();
  const { success, limit: lim, remaining, reset } = await ratelimit.limit(key);

  return {
    allowed: success,
    limit: lim,
    remaining,
    resetAt: reset,
    retryAfterSeconds: success
      ? Math.ceil(windowMs / 1000)
      : Math.max(1, Math.ceil((reset - now) / 1000)),
  };
}
