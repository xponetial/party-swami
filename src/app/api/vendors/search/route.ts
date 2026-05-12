import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getVendors, type MarketplaceFilters } from "@/lib/marketplace";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const querySchema = z.object({
  q: z.string().trim().optional(),
  zip: z.string().trim().optional(),
  category: z.string().trim().optional(),
  radiusMiles: z.coerce.number().int().min(1).max(250).optional(),
});

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "You must be signed in." }, { status: 401 });
  }

  const parsed = querySchema.safeParse({
    q: request.nextUrl.searchParams.get("q") ?? undefined,
    zip: request.nextUrl.searchParams.get("zip") ?? undefined,
    category: request.nextUrl.searchParams.get("category") ?? undefined,
    radiusMiles: request.nextUrl.searchParams.get("radiusMiles") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid vendor search query." },
      { status: 400 },
    );
  }

  const filters: MarketplaceFilters = {
    zip: parsed.data.zip,
    category: parsed.data.category,
    radiusMiles: parsed.data.radiusMiles,
  };
  const vendors = await getVendors(filters);
  const q = parsed.data.q?.toLowerCase();
  const filtered = q
    ? vendors.filter((vendor) =>
        `${vendor.businessName} ${vendor.category} ${vendor.city} ${vendor.state ?? ""}`
          .toLowerCase()
          .includes(q),
      )
    : vendors;

  return NextResponse.json({
    ok: true,
    count: filtered.length,
    vendors: filtered,
  });
}
