import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message: "Shopping list generation is scheduled for Milestone 5.",
    },
    { status: 501 },
  );
}
