const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileVerifyResult = {
  success: boolean;
  errorCodes: string[];
};

export class TurnstileConfigError extends Error {
  constructor() {
    super("Missing TURNSTILE_SECRET_KEY environment variable.");
    this.name = "TurnstileConfigError";
  }
}

export class TurnstileNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TurnstileNetworkError";
  }
}

export function extractRemoteIp(headers: Headers): string | null {
  const candidate = headers.get("cf-connecting-ip") ?? headers.get("x-forwarded-for");

  if (!candidate) {
    return null;
  }

  return candidate.split(",")[0]?.trim() ?? null;
}

export async function verifyTurnstileToken({
  token,
  remoteIp,
}: {
  token: string;
  remoteIp: string | null;
}): Promise<TurnstileVerifyResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    throw new TurnstileConfigError();
  }

  const body = new URLSearchParams({
    secret,
    response: token,
  });

  if (remoteIp) {
    body.set("remoteip", remoteIp);
  }

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    throw new TurnstileNetworkError("Turnstile verification request failed.");
  }

  const result = (await response.json()) as {
    success: boolean;
    "error-codes"?: string[];
  };

  return {
    success: Boolean(result.success),
    errorCodes: result["error-codes"] ?? [],
  };
}

type GuardOptions = {
  token: string | null | undefined;
  headers: Headers;
  context?: string;
};

type GuardResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

export async function guardWithTurnstile({
  token,
  headers,
  context,
}: GuardOptions): Promise<GuardResult> {
  if (!token || token.trim().length === 0) {
    return {
      ok: false,
      status: 400,
      message: "Bot-protection token is missing. Please refresh and try again.",
    };
  }

  try {
    const result = await verifyTurnstileToken({
      token,
      remoteIp: extractRemoteIp(headers),
    });

    if (!result.success) {
      console.warn("Turnstile verification rejected", {
        context: context ?? "unknown",
        errorCodes: result.errorCodes,
      });
      return {
        ok: false,
        status: 400,
        message: "Bot protection could not verify this request. Please try again.",
      };
    }

    return { ok: true };
  } catch (error) {
    if (error instanceof TurnstileConfigError) {
      console.error("Turnstile is not configured on the server.", { context });
      return {
        ok: false,
        status: 503,
        message: "Bot protection is not configured. Please try again later.",
      };
    }

    console.error("Turnstile verification failed", { context, error });
    return {
      ok: false,
      status: 503,
      message: "Bot protection is unavailable right now. Please try again.",
    };
  }
}
