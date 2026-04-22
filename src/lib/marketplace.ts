import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  MarketplaceLead,
  MarketplaceLeadActivity,
  MarketplaceProviderPackage,
  MarketplaceReview,
  PlannerProfile,
  VendorProfile,
} from "@/types/marketplace";

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
  service_notes: string | null;
  response_time_hours: number;
  profile_image_url: string | null;
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
  service_notes: string | null;
  response_time_hours: number;
  profile_image_url: string | null;
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
  package_id: string | null;
  created_at: string;
};

type ZipLocationRow = {
  zip_code: string;
  latitude: number;
  longitude: number;
};

type PackageRow = {
  id: string;
  vendor_id: string | null;
  planner_id: string | null;
  title: string;
  description: string;
  price: number | null;
  price_label: string | null;
  display_order: number;
  status: "active" | "paused";
  created_at: string;
};

type ReviewRow = {
  id: string;
  rating: number;
  title: string;
  body: string;
  status: "pending_review" | "approved" | "rejected";
  provider_response: string | null;
  provider_responded_at: string | null;
  created_at: string;
};

type LeadActivityRow = {
  id: string;
  action: string;
  from_status: "new" | "contacted" | "quoted" | "won" | "lost" | null;
  to_status: "new" | "contacted" | "quoted" | "won" | "lost" | null;
  note: string | null;
  created_at: string;
};

export type MarketplaceFilters = {
  zip?: string;
  category?: string;
  service?: string;
  radiusMiles?: number;
};

export type LeadEventDefaults = {
  id: string;
  title: string;
  eventType: string;
  eventDate: string | null;
  eventZipCode: string;
  budget: number | null;
};

function normalizeZip(value?: string | null) {
  return value?.replace(/\D/g, "").slice(0, 5) || "";
}

function distanceMiles(origin: ZipLocationRow, destination: ZipLocationRow) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const latitudeDelta = toRadians(destination.latitude - origin.latitude);
  const longitudeDelta = toRadians(destination.longitude - origin.longitude);
  const originLatitude = toRadians(origin.latitude);
  const destinationLatitude = toRadians(destination.latitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) * Math.cos(destinationLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getZipLocations(zipCodes: string[]) {
  const uniqueZipCodes = [...new Set(zipCodes.map(normalizeZip).filter(Boolean))];
  if (!uniqueZipCodes.length) return new Map<string, ZipLocationRow>();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("zip_code_locations")
    .select("zip_code, latitude, longitude")
    .in("zip_code", uniqueZipCodes)
    .returns<ZipLocationRow[]>();

  return new Map((data ?? []).map((location) => [location.zip_code, location] as const));
}

function mapPackage(row: PackageRow): MarketplaceProviderPackage {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    plannerId: row.planner_id,
    title: row.title,
    description: row.description,
    price: row.price,
    priceLabel: row.price_label,
    displayOrder: row.display_order,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapReview(row: ReviewRow): MarketplaceReview {
  return {
    id: row.id,
    rating: row.rating,
    title: row.title,
    body: row.body,
    status: row.status,
    providerResponse: row.provider_response,
    providerRespondedAt: row.provider_responded_at,
    createdAt: row.created_at,
  };
}

function mapLeadActivity(row: LeadActivityRow): MarketplaceLeadActivity {
  return {
    id: row.id,
    action: row.action,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    note: row.note,
    createdAt: row.created_at,
  };
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
    serviceNotes: row.service_notes,
    responseTimeHours: row.response_time_hours,
    profileImageUrl: row.profile_image_url,
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
    serviceNotes: row.service_notes,
    responseTimeHours: row.response_time_hours,
    profileImageUrl: row.profile_image_url,
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
    packageId: row.package_id,
  };
}

export async function getVendors(filters: MarketplaceFilters = {}) {
  const supabase = await createSupabaseServerClient();
  const zip = normalizeZip(filters.zip);
  const requestedRadius = Math.max(1, Math.min(filters.radiusMiles ?? 50, 250));
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

  const { data } = await query.returns<VendorRow[]>();
  const vendors = (data ?? []).map(mapVendor);

  if (!zip) {
    return vendors;
  }

  const locations = await getZipLocations([zip, ...vendors.map((vendor) => vendor.zipCode)]);
  const origin = locations.get(zip);

  if (!origin) {
    return vendors.filter((vendor) => vendor.zipCode === zip);
  }

  return vendors
    .map((vendor) => {
      const destination = locations.get(vendor.zipCode);
      const distance = destination ? distanceMiles(origin, destination) : null;
      return { ...vendor, distanceMiles: distance == null ? null : Number(distance.toFixed(1)) };
    })
    .filter((vendor) => {
      if (vendor.zipCode === zip) return true;
      if (vendor.distanceMiles == null) return false;
      return vendor.distanceMiles <= Math.max(requestedRadius, vendor.serviceRadiusMiles);
    })
    .sort((a, b) => {
      if (a.isVerified !== b.isVerified) return a.isVerified ? -1 : 1;
      return (a.distanceMiles ?? 9999) - (b.distanceMiles ?? 9999);
    })
    .slice(0, 24);
}

export async function getPlanners(filters: MarketplaceFilters = {}) {
  const supabase = await createSupabaseServerClient();
  const zip = normalizeZip(filters.zip);
  const requestedRadius = Math.max(1, Math.min(filters.radiusMiles ?? 50, 250));
  let query = supabase
    .from("planners")
    .select("*")
    .eq("status", "active")
    .order("is_verified", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(24);

  if (filters.service) {
    query = query.contains("services", [filters.service]);
  }

  const { data } = await query.returns<PlannerRow[]>();
  const planners = (data ?? []).map(mapPlanner);

  if (!zip) {
    return planners;
  }

  const locations = await getZipLocations([zip, ...planners.map((planner) => planner.zipCode)]);
  const origin = locations.get(zip);

  if (!origin) {
    return planners.filter((planner) => planner.zipCode === zip);
  }

  return planners
    .map((planner) => {
      const destination = locations.get(planner.zipCode);
      const distance = destination ? distanceMiles(origin, destination) : null;
      return { ...planner, distanceMiles: distance == null ? null : Number(distance.toFixed(1)) };
    })
    .filter((planner) => {
      if (planner.zipCode === zip) return true;
      if (planner.distanceMiles == null) return false;
      return planner.distanceMiles <= Math.max(requestedRadius, planner.serviceRadiusMiles);
    })
    .sort((a, b) => {
      if (a.isVerified !== b.isVerified) return a.isVerified ? -1 : 1;
      return (a.distanceMiles ?? 9999) - (b.distanceMiles ?? 9999);
    })
    .slice(0, 24);
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

export async function getVendorPackages(vendorId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("marketplace_provider_packages")
    .select("id, vendor_id, planner_id, title, description, price, price_label, display_order, status, created_at")
    .eq("vendor_id", vendorId)
    .eq("status", "active")
    .order("display_order", { ascending: true })
    .returns<PackageRow[]>();

  return (data ?? []).map(mapPackage);
}

export async function getPlannerPackages(plannerId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("marketplace_provider_packages")
    .select("id, vendor_id, planner_id, title, description, price, price_label, display_order, status, created_at")
    .eq("planner_id", plannerId)
    .eq("status", "active")
    .order("display_order", { ascending: true })
    .returns<PackageRow[]>();

  return (data ?? []).map(mapPackage);
}

export async function getVendorReviews(vendorId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("marketplace_reviews")
    .select("id, rating, title, body, status, provider_response, provider_responded_at, created_at")
    .eq("vendor_id", vendorId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(6)
    .returns<ReviewRow[]>();

  return (data ?? []).map(mapReview);
}

export async function getPlannerReviews(plannerId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("marketplace_reviews")
    .select("id, rating, title, body, status, provider_response, provider_responded_at, created_at")
    .eq("planner_id", plannerId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(6)
    .returns<ReviewRow[]>();

  return (data ?? []).map(mapReview);
}

export async function getLeadEventDefaults(eventId?: string | null): Promise<LeadEventDefaults | null> {
  if (!eventId) return null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: event } = await supabase
    .from("events")
    .select("id, title, event_type, event_date, location, budget")
    .eq("id", eventId)
    .eq("owner_id", user.id)
    .maybeSingle<{
      id: string;
      title: string;
      event_type: string;
      event_date: string | null;
      location: string | null;
      budget: number | null;
    }>();

  if (!event) return null;

  return {
    id: event.id,
    title: event.title,
    eventType: event.event_type,
    eventDate: event.event_date,
    eventZipCode: normalizeZip(event.location),
    budget: event.budget,
  };
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
    .select("id, lead_type, contact_name, contact_email, contact_phone, event_type, event_date, event_zip_code, budget, message, status, package_id, created_at")
    .in("vendor_id", vendorIds)
    .order("created_at", { ascending: false })
    .returns<LeadRow[]>();
  const packageIds = [...new Set((leads ?? []).map((lead) => lead.package_id).filter(Boolean) as string[])];
  const { data: packages } = packageIds.length
    ? await supabase
        .from("marketplace_provider_packages")
        .select("id, title")
        .in("id", packageIds)
        .returns<Array<{ id: string; title: string }>>()
    : { data: [] };
  const packageTitleById = new Map((packages ?? []).map((item) => [item.id, item.title] as const));

  return {
    profiles: vendors?.map(mapVendor) ?? [],
    leads: leads?.map((lead) => ({
      ...mapLead(lead),
      packageTitle: lead.package_id ? packageTitleById.get(lead.package_id) ?? null : null,
    })) ?? [],
  };
}

export async function getOwnedVendorReviews(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: vendors } = await supabase
    .from("vendors")
    .select("id")
    .eq("owner_id", userId)
    .returns<Array<{ id: string }>>();
  const vendorIds = (vendors ?? []).map((vendor) => vendor.id);

  if (!vendorIds.length) return [];

  const { data } = await supabase
    .from("marketplace_reviews")
    .select("id, rating, title, body, status, provider_response, provider_responded_at, created_at")
    .in("vendor_id", vendorIds)
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<ReviewRow[]>();

  return (data ?? []).map(mapReview);
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
    .select("id, lead_type, contact_name, contact_email, contact_phone, event_type, event_date, event_zip_code, budget, message, status, package_id, created_at")
    .in("planner_id", plannerIds)
    .order("created_at", { ascending: false })
    .returns<LeadRow[]>();
  const packageIds = [...new Set((leads ?? []).map((lead) => lead.package_id).filter(Boolean) as string[])];
  const { data: packages } = packageIds.length
    ? await supabase
        .from("marketplace_provider_packages")
        .select("id, title")
        .in("id", packageIds)
        .returns<Array<{ id: string; title: string }>>()
    : { data: [] };
  const packageTitleById = new Map((packages ?? []).map((item) => [item.id, item.title] as const));

  return {
    profiles: planners?.map(mapPlanner) ?? [],
    leads: leads?.map((lead) => ({
      ...mapLead(lead),
      packageTitle: lead.package_id ? packageTitleById.get(lead.package_id) ?? null : null,
    })) ?? [],
  };
}

export async function getOwnedPlannerReviews(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: planners } = await supabase
    .from("planners")
    .select("id")
    .eq("owner_id", userId)
    .returns<Array<{ id: string }>>();
  const plannerIds = (planners ?? []).map((planner) => planner.id);

  if (!plannerIds.length) return [];

  const { data } = await supabase
    .from("marketplace_reviews")
    .select("id, rating, title, body, status, provider_response, provider_responded_at, created_at")
    .in("planner_id", plannerIds)
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<ReviewRow[]>();

  return (data ?? []).map(mapReview);
}

export async function getLeadActivity(leadIds: string[]) {
  const ids = [...new Set(leadIds)].filter(Boolean);
  if (!ids.length) return new Map<string, MarketplaceLeadActivity[]>();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("marketplace_lead_activity")
    .select("id, lead_id, action, from_status, to_status, note, created_at")
    .in("lead_id", ids)
    .order("created_at", { ascending: false })
    .returns<Array<LeadActivityRow & { lead_id: string }>>();

  return (data ?? []).reduce<Map<string, MarketplaceLeadActivity[]>>((map, row) => {
    map.set(row.lead_id, [...(map.get(row.lead_id) ?? []), mapLeadActivity(row)]);
    return map;
  }, new Map());
}
