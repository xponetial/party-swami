import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message: "AI planning is scheduled for Milestone 3.",
    },
    { status: 501 },
  );
}
