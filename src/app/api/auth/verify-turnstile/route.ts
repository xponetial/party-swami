import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { guardWithTurnstile } from "@/lib/security/turnstile";

const bodySchema = z.object({
  turnstileToken: z.string().trim().min(1),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Token is required." }, { status: 400 });
  }

  const result = await guardWithTurnstile({
    token: parsed.data.turnstileToken,
    headers: request.headers,
    context: "auth:reset-password",
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
