import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message: "Invite copy generation is scheduled for Milestone 4.",
    },
    { status: 501 },
  );
}
