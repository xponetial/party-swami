import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message: "Invite sending is scheduled for Milestone 4.",
    },
    { status: 501 },
  );
}
