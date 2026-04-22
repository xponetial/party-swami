import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MarketplaceLead, PlannerProfile, VendorProfile } from "@/types/marketplace";

type VendorRow = {
  id: string;
  owner_id: string;
  business_name: string;
  slug: string;
  category: string;
  city: string;
  state: string | null;
  zip_code: string;
  service_radius_miles: number;
  contact_name: string | null;
  contact_email: string;
  contact_phone: string | null;
  website_url: string | null;
  affiliate_url: string | null;
  pricing_model: "fixed_packages" | "custom_quotes" | "affiliate_links";
  starting_price: number | null;
  description: string;
  portfolio_urls: string[] | null;
  status: "active" | "paused" | "pending_review";
  is_verified: boolean;
  created_at: string;
};

type PlannerRow = {
  id: string;
  owner_id: string;
  business_name: string;
  slug: string;
  city: string;
  state: string | null;
  zip_code: string;
  service_radius_miles: number;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  website_url: string | null;
  years_experience: number | null;
  certifications: string | null;
  consultation_price: number | null;
  hourly_rate: number | null;
  full_service_minimum: number | null;
  bio: string;
  services: string[] | null;
  availability_note: string | null;
  status: "active" | "paused" | "pending_review";
  is_verified: boolean;
  created_at: string;
};

type LeadRow = {
  id: string;
  lead_type: "vendor" | "planner_consultation" | "planner_full_service";
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  event_type: string | null;
  event_date: string | null;
  event_zip_code: string | null;
  budget: number | null;
  message: string;
  status: "new" | "contacted" | "quoted" | "won" | "lost";
  created_at: string;
};

export type MarketplaceFilters = {
  zip?: string;
  category?: string;
  service?: string;
};

function normalizeZip(value?: string | null) {
  return value?.replace(/\D/g, "").slice(0, 5) || "";
}

function mapVendor(row: VendorRow): VendorProfile {
  return {
    id: row.id,
    ownerId: row.owner_id,
    businessName: row.business_name,
    slug: row.slug,
    category: row.category,
    city: row.city,
    state: row.state,
    zipCode: row.zip_code,
    serviceRadiusMiles: row.service_radius_miles,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    websiteUrl: row.website_url,
    affiliateUrl: row.affiliate_url,
    pricingModel: row.pricing_model,
    startingPrice: row.starting_price,
    description: row.description,
    portfolioUrls: row.portfolio_urls ?? [],
    status: row.status,
    isVerified: row.is_verified,
    createdAt: row.created_at,
  };
}

function mapPlanner(row: PlannerRow): PlannerProfile {
  return {
    id: row.id,
    ownerId: row.owner_id,
    businessName: row.business_name,
    slug: row.slug,
    city: row.city,
    state: row.state,
    zipCode: row.zip_code,
    serviceRadiusMiles: row.service_radius_miles,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    websiteUrl: row.website_url,
    yearsExperience: row.years_experience,
    certifications: row.certifications,
    consultationPrice: row.consultation_price,
    hourlyRate: row.hourly_rate,
    fullServiceMinimum: row.full_service_minimum,
    bio: row.bio,
    services: row.services ?? [],
    availabilityNote: row.availability_note,
    status: row.status,
    isVerified: row.is_verified,
    createdAt: row.created_at,
  };
}

function mapLead(row: LeadRow): MarketplaceLead {
  return {
    id: row.id,
    leadType: row.lead_type,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    eventType: row.event_type,
    eventDate: row.event_date,
    eventZipCode: row.event_zip_code,
    budget: row.budget,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function getVendors(filters: MarketplaceFilters = {}) {
  const supabase = await createSupabaseServerClient();
  const zip = normalizeZip(filters.zip);
  let query = supabase
    .from("vendors")
    .select("*")
    .eq("status", "active")
    .order("is_verified", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(24);

  if (filters.category) {
    query = query.eq("category", filters.category);
  }

  if (zip) {
    query = query.eq("zip_code", zip);
  }

  const { data } = await query.returns<VendorRow[]>();
  return (data ?? []).map(mapVendor);
}

export async function getPlanners(filters: MarketplaceFilters = {}) {
  const supabase = await createSupabaseServerClient();
  const zip = normalizeZip(filters.zip);
  let query = supabase
    .from("planners")
    .select("*")
    .eq("status", "active")
    .order("is_verified", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(24);

  if (zip) {
    query = query.eq("zip_code", zip);
  }

  if (filters.service) {
    query = query.contains("services", [filters.service]);
  }

  const { data } = await query.returns<PlannerRow[]>();
  return (data ?? []).map(mapPlanner);
}

export async function getVendorBySlug(slug: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("vendors")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle<VendorRow>();

  return data ? mapVendor(data) : null;
}

export async function getPlannerBySlug(slug: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("planners")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle<PlannerRow>();

  return data ? mapPlanner(data) : null;
}

export async function getOwnedVendorDashboard(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: vendors } = await supabase
    .from("vendors")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .returns<VendorRow[]>();
  const vendorIds = (vendors ?? []).map((vendor) => vendor.id);

  if (!vendorIds.length) {
    return { profiles: [], leads: [] };
  }

  const { data: leads } = await supabase
    .from("marketplace_leads")
    .select("id, lead_type, contact_name, contact_email, contact_phone, event_type, event_date, event_zip_code, budget, message, status, created_at")
    .in("vendor_id", vendorIds)
    .order("created_at", { ascending: false })
    .returns<LeadRow[]>();

  return {
    profiles: vendors?.map(mapVendor) ?? [],
    leads: leads?.map(mapLead) ?? [],
  };
}

export async function getOwnedPlannerDashboard(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: planners } = await supabase
    .from("planners")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .returns<PlannerRow[]>();
  const plannerIds = (planners ?? []).map((planner) => planner.id);

  if (!plannerIds.length) {
    return { profiles: [], leads: [] };
  }

  const { data: leads } = await supabase
    .from("marketplace_leads")
    .select("id, lead_type, contact_name, contact_email, contact_phone, event_type, event_date, event_zip_code, budget, message, status, created_at")
    .in("planner_id", plannerIds)
    .order("created_at", { ascending: false })
    .returns<LeadRow[]>();

  return {
    profiles: planners?.map(mapPlanner) ?? [],
    leads: leads?.map(mapLead) ?? [],
  };
}
