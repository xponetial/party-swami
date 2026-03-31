import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message: "Hosted payment flows are outside the current MVP scope.",
    },
    { status: 501 },
  );
}
