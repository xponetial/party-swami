import { headers } from "next/headers";

const DEFAULT_REDIRECT_PATH = "/dashboard";

export async function getAppOrigin() {
  const headerStore = await headers();
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost ?? headerStore.get("host");
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const originHeader = headerStore.get("origin");

  if (host) {
    const protocol =
      forwardedProto ??
      (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

    return `${protocol}://${host}`;
  }

  if (originHeader) {
    return originHeader;
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

export function sanitizeNextPath(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== "string" || value.length === 0) {
    return DEFAULT_REDIRECT_PATH;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_REDIRECT_PATH;
  }

  return value;
}
