import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const bearerToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";

  const cronSecret = process.env.CRON_SECRET?.trim();
  const keepaliveToken = process.env.UPSTASH_KEEPALIVE_TOKEN?.trim();

  if (cronSecret && bearerToken === cronSecret) {
    return true;
  }

  if (keepaliveToken && bearerToken === keepaliveToken) {
    return true;
  }

  return false;
}

function getRedisClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    return null;
  }

  return new Redis({ url, token });
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const redis = getRedisClient();

  if (!redis) {
    return NextResponse.json(
      { ok: false, message: "Upstash environment variables are not configured." },
      { status: 503 },
    );
  }

  const key = "internal:upstash:keepalive:last_seen";
  const now = new Date().toISOString();

  await redis.set(key, now, { ex: 60 * 60 * 24 * 14 });
  const echoed = await redis.get<string>(key);

  return NextResponse.json({
    ok: true,
    key,
    value: echoed ?? now,
    touchedAt: now,
  });
}
