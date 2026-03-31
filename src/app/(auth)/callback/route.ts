import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      message: "Supabase auth callback will be implemented in Milestone 2.",
    },
    { status: 501 },
  );
}
