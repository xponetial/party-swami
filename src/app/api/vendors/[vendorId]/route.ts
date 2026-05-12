import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getVendorPackages,
  getVendorReviews,
  getVendorsByIds,
} from "@/lib/marketplace";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const paramsSchema = z.object({
  vendorId: z.string().uuid(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ vendorId: string }> },
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "You must be signed in." }, { status: 401 });
  }

  const rawParams = await context.params;
  const parsedParams = paramsSchema.safeParse(rawParams);
  if (!parsedParams.success) {
    return NextResponse.json(
      { ok: false, message: parsedParams.error.issues[0]?.message ?? "Invalid vendor id." },
      { status: 400 },
    );
  }

  const [vendor] = await getVendorsByIds([parsedParams.data.vendorId]);
  if (!vendor) {
    return NextResponse.json({ ok: false, message: "Vendor not found." }, { status: 404 });
  }

  const [packages, reviews] = await Promise.all([
    getVendorPackages(vendor.id),
    getVendorReviews(vendor.id),
  ]);

  return NextResponse.json({
    ok: true,
    vendor,
    packages,
    reviews,
  });
}
