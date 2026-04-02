const WINDOW_STATE = new Map<string, { count: number; resetAt: number }>();

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

type ConsumeRateLimitOptions = {
  bucket: string;
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
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

function pruneExpiredEntries(now: number) {
  if (WINDOW_STATE.size < 500) {
    return;
  }

  for (const [entryKey, entry] of WINDOW_STATE.entries()) {
    if (entry.resetAt <= now) {
      WINDOW_STATE.delete(entryKey);
    }
  }
}

export function getClientIpFromHeaders(headers: Pick<Headers, "get">) {
  return normalizeClientIp(
    headers.get("x-forwarded-for") ||
      headers.get("cf-connecting-ip") ||
      headers.get("x-real-ip"),
  );
}

export function consumeRateLimit({
  bucket,
  key,
  limit,
  windowMs,
  now = Date.now(),
}: ConsumeRateLimitOptions): RateLimitResult {
  pruneExpiredEntries(now);

  const bucketKey = `${bucket}:${key}`;
  const existing = WINDOW_STATE.get(bucketKey);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;

    WINDOW_STATE.set(bucketKey, {
      count: 1,
      resetAt,
    });

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
