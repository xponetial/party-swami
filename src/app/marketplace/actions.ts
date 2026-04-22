"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { notifyMarketplaceLead } from "@/lib/email/marketplace";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAuditLog, trackAnalyticsEvent } from "@/lib/telemetry";

const blankToNullNumber = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return null;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return value;
}, z.number().min(0).nullable());

const urlOrBlank = z.url().optional().or(z.literal(""));

const vendorSignupSchema = z.object({
  businessName: z.string().trim().min(2, "Business name is required."),
  category: z.string().trim().min(2, "Choose a vendor category."),
  city: z.string().trim().min(2, "City is required."),
  state: z.string().trim().max(32).optional(),
  zipCode: z.string().trim().regex(/^\d{5}$/, "Use a 5-digit ZIP code."),
  serviceRadiusMiles: z.coerce.number().int().min(1).max(250),
  contactName: z.string().trim().optional(),
  contactEmail: z.email("Use a valid contact email."),
  contactPhone: z.string().trim().optional(),
  websiteUrl: urlOrBlank,
  affiliateUrl: urlOrBlank,
  pricingModel: z.enum(["fixed_packages", "custom_quotes", "affiliate_links"]),
  startingPrice: blankToNullNumber,
  description: z.string().trim().min(40, "Add at least 40 characters describing the service."),
  portfolioUrls: z.string().trim().optional(),
});

const plannerSignupSchema = z.object({
  businessName: z.string().trim().min(2, "Business name is required."),
  contactName: z.string().trim().min(2, "Contact name is required."),
  city: z.string().trim().min(2, "City is required."),
  state: z.string().trim().max(32).optional(),
  zipCode: z.string().trim().regex(/^\d{5}$/, "Use a 5-digit ZIP code."),
  serviceRadiusMiles: z.coerce.number().int().min(1).max(250),
  contactEmail: z.email("Use a valid contact email."),
  contactPhone: z.string().trim().optional(),
  websiteUrl: urlOrBlank,
  yearsExperience: blankToNullNumber,
  certifications: z.string().trim().optional(),
  consultationPrice: blankToNullNumber,
  hourlyRate: blankToNullNumber,
  fullServiceMinimum: blankToNullNumber,
  bio: z.string().trim().min(40, "Add at least 40 characters about your planning style."),
  services: z.array(z.string()).default([]),
  availabilityNote: z.string().trim().optional(),
});

const leadSchema = z.object({
  providerType: z.enum(["vendor", "planner"]),
  providerId: z.string().uuid(),
  packageId: z.string().uuid().optional().or(z.literal("")),
  eventId: z.string().uuid().optional().or(z.literal("")),
  leadType: z.enum(["vendor", "planner_consultation", "planner_full_service"]),
  contactName: z.string().trim().min(2, "Your name is required."),
  contactEmail: z.email("Use a valid email."),
  contactPhone: z.string().trim().optional(),
  eventType: z.string().trim().optional(),
  eventDate: z.string().optional(),
  eventZipCode: z.string().trim().regex(/^\d{5}$/, "Use a 5-digit ZIP code.").optional().or(z.literal("")),
  budget: blankToNullNumber,
  message: z.string().trim().min(20, "Add a short note about what you need."),
  marketplaceAgreement: z.literal("accepted", {
    error: "Confirm that you understand providers handle quotes, payment, and service delivery.",
  }),
  returnTo: z.string().startsWith("/"),
});

const providerLeadStatusSchema = z.object({
  leadId: z.string().uuid(),
  status: z.enum(["new", "contacted", "quoted", "won", "lost"]),
  providerType: z.enum(["vendor", "planner"]),
  returnTo: z.string().startsWith("/"),
});

const providerPackageSchema = z.object({
  providerType: z.enum(["vendor", "planner"]),
  providerId: z.string().uuid(),
  title: z.string().trim().min(3, "Package title is required.").max(120),
  description: z.string().trim().min(15, "Package description is required.").max(500),
  price: blankToNullNumber,
  priceLabel: z.string().trim().max(80).optional(),
  returnTo: z.string().startsWith("/"),
});

const reviewSchema = z.object({
  providerType: z.enum(["vendor", "planner"]),
  providerId: z.string().uuid(),
  eventId: z.string().uuid().optional().or(z.literal("")),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().min(3, "Review title is required.").max(120),
  body: z.string().trim().min(20, "Add a little more detail to the review.").max(1000),
  returnTo: z.string().startsWith("/"),
});

function createSlug(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 52);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || "provider"}-${suffix}`;
}

function parseUrlList(value?: string) {
  return (value ?? "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function createVendorProfileAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = vendorSignupSchema.safeParse({
    businessName: formData.get("businessName"),
    category: formData.get("category"),
    city: formData.get("city"),
    state: formData.get("state") || undefined,
    zipCode: formData.get("zipCode"),
    serviceRadiusMiles: formData.get("serviceRadiusMiles") || 25,
    contactName: formData.get("contactName") || undefined,
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone") || undefined,
    websiteUrl: formData.get("websiteUrl") || "",
    affiliateUrl: formData.get("affiliateUrl") || "",
    pricingModel: formData.get("pricingModel"),
    startingPrice: formData.get("startingPrice"),
    description: formData.get("description"),
    portfolioUrls: formData.get("portfolioUrls") || undefined,
  });

  if (!parsed.success) {
    redirectWithError("/vendors/signup", parsed.error.issues[0]?.message ?? "Check your vendor details.");
  }

  const slug = createSlug(parsed.data.businessName);
  const { error } = await supabase.from("vendors").insert({
    owner_id: user.id,
    business_name: parsed.data.businessName,
    slug,
    category: parsed.data.category,
    city: parsed.data.city,
    state: parsed.data.state?.trim() || null,
    zip_code: parsed.data.zipCode,
    service_radius_miles: parsed.data.serviceRadiusMiles,
    contact_name: parsed.data.contactName?.trim() || null,
    contact_email: parsed.data.contactEmail,
    contact_phone: parsed.data.contactPhone?.trim() || null,
    website_url: parsed.data.websiteUrl || null,
    affiliate_url: parsed.data.affiliateUrl || null,
    pricing_model: parsed.data.pricingModel,
    starting_price: parsed.data.startingPrice,
    description: parsed.data.description,
    portfolio_urls: parseUrlList(parsed.data.portfolioUrls),
    status: "active",
  });

  if (error) {
    redirectWithError("/vendors/signup", error.message);
  }

  revalidatePath("/vendors");
  revalidatePath("/vendors/dashboard");
  redirect(`/vendors/${slug}?created=1`);
}

export async function createPlannerProfileAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = plannerSignupSchema.safeParse({
    businessName: formData.get("businessName"),
    contactName: formData.get("contactName"),
    city: formData.get("city"),
    state: formData.get("state") || undefined,
    zipCode: formData.get("zipCode"),
    serviceRadiusMiles: formData.get("serviceRadiusMiles") || 35,
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone") || undefined,
    websiteUrl: formData.get("websiteUrl") || "",
    yearsExperience: formData.get("yearsExperience"),
    certifications: formData.get("certifications") || undefined,
    consultationPrice: formData.get("consultationPrice"),
    hourlyRate: formData.get("hourlyRate"),
    fullServiceMinimum: formData.get("fullServiceMinimum"),
    bio: formData.get("bio"),
    services: formData.getAll("services"),
    availabilityNote: formData.get("availabilityNote") || undefined,
  });

  if (!parsed.success) {
    redirectWithError("/planners/signup", parsed.error.issues[0]?.message ?? "Check your planner details.");
  }

  const slug = createSlug(parsed.data.businessName);
  const { error } = await supabase.from("planners").insert({
    owner_id: user.id,
    business_name: parsed.data.businessName,
    slug,
    city: parsed.data.city,
    state: parsed.data.state?.trim() || null,
    zip_code: parsed.data.zipCode,
    service_radius_miles: parsed.data.serviceRadiusMiles,
    contact_name: parsed.data.contactName,
    contact_email: parsed.data.contactEmail,
    contact_phone: parsed.data.contactPhone?.trim() || null,
    website_url: parsed.data.websiteUrl || null,
    years_experience: parsed.data.yearsExperience,
    certifications: parsed.data.certifications?.trim() || null,
    consultation_price: parsed.data.consultationPrice,
    hourly_rate: parsed.data.hourlyRate,
    full_service_minimum: parsed.data.fullServiceMinimum,
    bio: parsed.data.bio,
    services: parsed.data.services,
    availability_note: parsed.data.availabilityNote?.trim() || null,
    status: "active",
  });

  if (error) {
    redirectWithError("/planners/signup", error.message);
  }

  revalidatePath("/planners");
  revalidatePath("/planners/dashboard");
  redirect(`/planners/${slug}?created=1`);
}

export async function createMarketplaceLeadAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = leadSchema.safeParse({
    providerType: formData.get("providerType"),
    providerId: formData.get("providerId"),
    packageId: formData.get("packageId") || "",
    eventId: formData.get("eventId") || "",
    leadType: formData.get("leadType"),
    contactName: formData.get("contactName"),
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone") || undefined,
    eventType: formData.get("eventType") || undefined,
    eventDate: formData.get("eventDate") || undefined,
    eventZipCode: formData.get("eventZipCode") || "",
    budget: formData.get("budget"),
    message: formData.get("message"),
    marketplaceAgreement: formData.get("marketplaceAgreement"),
    returnTo: formData.get("returnTo"),
  });

  if (!parsed.success) {
    redirectWithError(formData.get("returnTo")?.toString() || "/marketplace", parsed.error.issues[0]?.message ?? "Check your request.");
  }

  let eventId = parsed.data.eventId || null;
  const packageId = parsed.data.packageId || null;
  let eventDate: string | null = parsed.data.eventDate
    ? new Date(`${parsed.data.eventDate}T12:00:00`).toISOString()
    : null;
  let eventType = parsed.data.eventType?.trim() || null;
  let budget = parsed.data.budget;

  if (eventId) {
    const { data: event } = await supabase
      .from("events")
      .select("id, event_type, event_date, budget")
      .eq("id", eventId)
      .eq("owner_id", user.id)
      .maybeSingle<{ id: string; event_type: string; event_date: string | null; budget: number | null }>();

    if (!event) {
      eventId = null;
    } else {
      eventType = eventType ?? event.event_type;
      eventDate = eventDate ?? event.event_date;
      budget = budget ?? event.budget;
    }
  }

  const providerTable = parsed.data.providerType === "vendor" ? "vendors" : "planners";
  const { data: provider } = await supabase
    .from(providerTable)
    .select("id, business_name, contact_email")
    .eq("id", parsed.data.providerId)
    .eq("status", "active")
    .maybeSingle<{ id: string; business_name: string; contact_email: string }>();

  if (!provider) {
    redirectWithError(parsed.data.returnTo, "Provider is not available.");
  }

  let packageTitle: string | null = null;
  if (packageId) {
    const packageProviderColumn = parsed.data.providerType === "vendor" ? "vendor_id" : "planner_id";
    const { data: selectedPackage } = await supabase
      .from("marketplace_provider_packages")
      .select("id, title")
      .eq("id", packageId)
      .eq(packageProviderColumn, parsed.data.providerId)
      .eq("status", "active")
      .maybeSingle<{ id: string; title: string }>();

    if (!selectedPackage) {
      redirectWithError(parsed.data.returnTo, "Selected package is not available.");
    }

    packageTitle = selectedPackage.title;
  }

  const { data: createdLead, error } = await supabase.from("marketplace_leads").insert({
    consumer_id: user.id,
    event_id: eventId,
    vendor_id: parsed.data.providerType === "vendor" ? parsed.data.providerId : null,
    planner_id: parsed.data.providerType === "planner" ? parsed.data.providerId : null,
    package_id: packageId,
    lead_type: parsed.data.leadType,
    contact_name: parsed.data.contactName,
    contact_email: parsed.data.contactEmail,
    contact_phone: parsed.data.contactPhone?.trim() || null,
    event_type: eventType,
    event_date: eventDate,
    event_zip_code: parsed.data.eventZipCode || null,
    budget,
    message: parsed.data.message,
  }).select("id").single<{ id: string }>();

  if (error || !createdLead) {
    redirectWithError(parsed.data.returnTo, error.message);
  }

  await Promise.all([
    supabase.from("marketplace_lead_activity").insert({
      lead_id: createdLead.id,
      actor_id: user.id,
      action: "lead_submitted",
      to_status: "new",
      note: packageTitle ? `Requested package: ${packageTitle}` : null,
      metadata: {
        provider_type: parsed.data.providerType,
        provider_id: parsed.data.providerId,
      },
    }),
    trackAnalyticsEvent(supabase, {
      eventName: "marketplace_lead_submitted",
      userId: user.id,
      eventId,
      metadata: {
        provider_type: parsed.data.providerType,
        provider_id: parsed.data.providerId,
        lead_type: parsed.data.leadType,
        package_id: packageId,
        event_zip_code: parsed.data.eventZipCode || null,
      },
    }),
    createAuditLog(supabase, {
      action: "marketplace_lead_submitted",
      userId: user.id,
      eventId,
      metadata: {
        provider_type: parsed.data.providerType,
        provider_id: parsed.data.providerId,
        lead_type: parsed.data.leadType,
        package_id: packageId,
      },
    }),
    notifyMarketplaceLead({
      leadId: createdLead.id,
      providerType: parsed.data.providerType,
      providerName: provider.business_name,
      providerEmail: provider.contact_email,
      hostName: parsed.data.contactName,
      hostEmail: parsed.data.contactEmail,
      eventType,
      eventZipCode: parsed.data.eventZipCode || null,
      message: parsed.data.message,
      packageTitle,
    }),
  ]);

  revalidatePath("/vendors/dashboard");
  revalidatePath("/planners/dashboard");
  redirect(`${parsed.data.returnTo}?lead=sent`);
}

export async function updateProviderLeadStatusAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = providerLeadStatusSchema.safeParse({
    leadId: formData.get("leadId"),
    status: formData.get("status"),
    providerType: formData.get("providerType"),
    returnTo: formData.get("returnTo") || "/dashboard",
  });

  if (!parsed.success) {
    redirectWithError("/dashboard", parsed.error.issues[0]?.message ?? "Could not update lead status.");
  }

  const providerTable = parsed.data.providerType === "vendor" ? "vendors" : "planners";
  const providerColumn = parsed.data.providerType === "vendor" ? "vendor_id" : "planner_id";
  const { data: lead } = await supabase
    .from("marketplace_leads")
    .select(`id, status, ${providerColumn}`)
    .eq("id", parsed.data.leadId)
    .maybeSingle<Record<string, string | null>>();

  const providerId = lead?.[providerColumn];
  if (!providerId) {
    redirectWithError(parsed.data.returnTo, "Lead not found.");
  }

  const { data: ownedProvider } = await supabase
    .from(providerTable)
    .select("id")
    .eq("id", providerId)
    .eq("owner_id", user.id)
    .maybeSingle<{ id: string }>();

  if (!ownedProvider) {
    redirectWithError(parsed.data.returnTo, "You do not own this provider profile.");
  }

  const { error } = await supabase
    .from("marketplace_leads")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.leadId);

  if (error) {
    redirectWithError(parsed.data.returnTo, error.message);
  }

  await Promise.all([
    supabase.from("marketplace_lead_activity").insert({
      lead_id: parsed.data.leadId,
      actor_id: user.id,
      action: "status_updated",
      from_status: lead?.status ?? null,
      to_status: parsed.data.status,
      metadata: {
        source: `${parsed.data.providerType}_dashboard`,
      },
    }),
    trackAnalyticsEvent(supabase, {
      eventName: "marketplace_lead_status_updated",
      userId: user.id,
      metadata: {
        lead_id: parsed.data.leadId,
        status: parsed.data.status,
        source: `${parsed.data.providerType}_dashboard`,
      },
    }),
    createAuditLog(supabase, {
      action: "marketplace_lead_status_updated",
      userId: user.id,
      metadata: {
        lead_id: parsed.data.leadId,
        status: parsed.data.status,
        source: `${parsed.data.providerType}_dashboard`,
      },
    }),
  ]);

  revalidatePath(parsed.data.returnTo);
  redirect(`${parsed.data.returnTo}?status=updated`);
}

export async function updateVendorProfileAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const providerId = formData.get("providerId")?.toString() ?? "";
  const returnTo = formData.get("returnTo")?.toString() || "/vendors/dashboard";
  const parsed = vendorSignupSchema.safeParse({
    businessName: formData.get("businessName"),
    category: formData.get("category"),
    city: formData.get("city"),
    state: formData.get("state") || undefined,
    zipCode: formData.get("zipCode"),
    serviceRadiusMiles: formData.get("serviceRadiusMiles") || 25,
    contactName: formData.get("contactName") || undefined,
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone") || undefined,
    websiteUrl: formData.get("websiteUrl") || "",
    affiliateUrl: formData.get("affiliateUrl") || "",
    pricingModel: formData.get("pricingModel"),
    startingPrice: formData.get("startingPrice"),
    description: formData.get("description"),
    portfolioUrls: formData.get("portfolioUrls") || undefined,
  });

  if (!z.string().uuid().safeParse(providerId).success || !parsed.success || !returnTo.startsWith("/vendors/dashboard")) {
    redirectWithError("/vendors/dashboard", parsed.success ? "Invalid vendor profile." : parsed.error.issues[0]?.message ?? "Check your vendor details.");
  }

  const { error } = await supabase
    .from("vendors")
    .update({
      business_name: parsed.data.businessName,
      category: parsed.data.category,
      city: parsed.data.city,
      state: parsed.data.state?.trim() || null,
      zip_code: parsed.data.zipCode,
      service_radius_miles: parsed.data.serviceRadiusMiles,
      contact_name: parsed.data.contactName?.trim() || null,
      contact_email: parsed.data.contactEmail,
      contact_phone: parsed.data.contactPhone?.trim() || null,
      website_url: parsed.data.websiteUrl || null,
      affiliate_url: parsed.data.affiliateUrl || null,
      pricing_model: parsed.data.pricingModel,
      starting_price: parsed.data.startingPrice,
      description: parsed.data.description,
      portfolio_urls: parseUrlList(parsed.data.portfolioUrls),
      service_notes: formData.get("serviceNotes")?.toString().trim() || null,
      response_time_hours: Number(formData.get("responseTimeHours") || 24),
    })
    .eq("id", providerId)
    .eq("owner_id", user.id);

  if (error) {
    redirectWithError(returnTo, error.message);
  }

  await trackAnalyticsEvent(supabase, {
    eventName: "marketplace_provider_profile_updated",
    userId: user.id,
    metadata: { provider_type: "vendor", provider_id: providerId },
  });
  revalidatePath("/marketplace");
  revalidatePath("/vendors/dashboard");
  redirect(`${returnTo}?profile=updated`);
}

export async function updatePlannerProfileAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const providerId = formData.get("providerId")?.toString() ?? "";
  const returnTo = formData.get("returnTo")?.toString() || "/planners/dashboard";
  const parsed = plannerSignupSchema.safeParse({
    businessName: formData.get("businessName"),
    contactName: formData.get("contactName"),
    city: formData.get("city"),
    state: formData.get("state") || undefined,
    zipCode: formData.get("zipCode"),
    serviceRadiusMiles: formData.get("serviceRadiusMiles") || 35,
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone") || undefined,
    websiteUrl: formData.get("websiteUrl") || "",
    yearsExperience: formData.get("yearsExperience"),
    certifications: formData.get("certifications") || undefined,
    consultationPrice: formData.get("consultationPrice"),
    hourlyRate: formData.get("hourlyRate"),
    fullServiceMinimum: formData.get("fullServiceMinimum"),
    bio: formData.get("bio"),
    services: formData.getAll("services"),
    availabilityNote: formData.get("availabilityNote") || undefined,
  });

  if (!z.string().uuid().safeParse(providerId).success || !parsed.success || !returnTo.startsWith("/planners/dashboard")) {
    redirectWithError("/planners/dashboard", parsed.success ? "Invalid planner profile." : parsed.error.issues[0]?.message ?? "Check your planner details.");
  }

  const { error } = await supabase
    .from("planners")
    .update({
      business_name: parsed.data.businessName,
      contact_name: parsed.data.contactName,
      city: parsed.data.city,
      state: parsed.data.state?.trim() || null,
      zip_code: parsed.data.zipCode,
      service_radius_miles: parsed.data.serviceRadiusMiles,
      contact_email: parsed.data.contactEmail,
      contact_phone: parsed.data.contactPhone?.trim() || null,
      website_url: parsed.data.websiteUrl || null,
      years_experience: parsed.data.yearsExperience,
      certifications: parsed.data.certifications?.trim() || null,
      consultation_price: parsed.data.consultationPrice,
      hourly_rate: parsed.data.hourlyRate,
      full_service_minimum: parsed.data.fullServiceMinimum,
      bio: parsed.data.bio,
      services: parsed.data.services,
      availability_note: parsed.data.availabilityNote?.trim() || null,
      service_notes: formData.get("serviceNotes")?.toString().trim() || null,
      response_time_hours: Number(formData.get("responseTimeHours") || 24),
    })
    .eq("id", providerId)
    .eq("owner_id", user.id);

  if (error) {
    redirectWithError(returnTo, error.message);
  }

  await trackAnalyticsEvent(supabase, {
    eventName: "marketplace_provider_profile_updated",
    userId: user.id,
    metadata: { provider_type: "planner", provider_id: providerId },
  });
  revalidatePath("/marketplace");
  revalidatePath("/planners/dashboard");
  redirect(`${returnTo}?profile=updated`);
}

export async function createProviderPackageAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = providerPackageSchema.safeParse({
    providerType: formData.get("providerType"),
    providerId: formData.get("providerId"),
    title: formData.get("title"),
    description: formData.get("description"),
    price: formData.get("price"),
    priceLabel: formData.get("priceLabel") || undefined,
    returnTo: formData.get("returnTo") || "/dashboard",
  });

  if (!parsed.success) {
    redirectWithError("/dashboard", parsed.error.issues[0]?.message ?? "Check the package details.");
  }

  const table = parsed.data.providerType === "vendor" ? "vendors" : "planners";
  const { data: ownedProvider } = await supabase
    .from(table)
    .select("id")
    .eq("id", parsed.data.providerId)
    .eq("owner_id", user.id)
    .maybeSingle<{ id: string }>();

  if (!ownedProvider) {
    redirectWithError(parsed.data.returnTo, "You do not own this provider profile.");
  }

  const { error } = await supabase.from("marketplace_provider_packages").insert({
    vendor_id: parsed.data.providerType === "vendor" ? parsed.data.providerId : null,
    planner_id: parsed.data.providerType === "planner" ? parsed.data.providerId : null,
    title: parsed.data.title,
    description: parsed.data.description,
    price: parsed.data.price,
    price_label: parsed.data.priceLabel?.trim() || null,
  });

  if (error) {
    redirectWithError(parsed.data.returnTo, error.message);
  }

  await trackAnalyticsEvent(supabase, {
    eventName: "marketplace_provider_package_created",
    userId: user.id,
    metadata: {
      provider_type: parsed.data.providerType,
      provider_id: parsed.data.providerId,
    },
  });
  revalidatePath(parsed.data.returnTo);
  redirect(`${parsed.data.returnTo}?package=created`);
}

export async function createMarketplaceReviewAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = reviewSchema.safeParse({
    providerType: formData.get("providerType"),
    providerId: formData.get("providerId"),
    eventId: formData.get("eventId") || "",
    rating: formData.get("rating"),
    title: formData.get("title"),
    body: formData.get("body"),
    returnTo: formData.get("returnTo") || "/marketplace",
  });

  if (!parsed.success) {
    redirectWithError("/marketplace", parsed.error.issues[0]?.message ?? "Check the review.");
  }

  const { error } = await supabase.from("marketplace_reviews").insert({
    consumer_id: user.id,
    event_id: parsed.data.eventId || null,
    vendor_id: parsed.data.providerType === "vendor" ? parsed.data.providerId : null,
    planner_id: parsed.data.providerType === "planner" ? parsed.data.providerId : null,
    rating: parsed.data.rating,
    title: parsed.data.title,
    body: parsed.data.body,
  });

  if (error) {
    redirectWithError(parsed.data.returnTo, error.message);
  }

  await trackAnalyticsEvent(supabase, {
    eventName: "marketplace_review_submitted",
    userId: user.id,
    metadata: {
      provider_type: parsed.data.providerType,
      provider_id: parsed.data.providerId,
      rating: parsed.data.rating,
    },
  });
  revalidatePath(parsed.data.returnTo);
  redirect(`${parsed.data.returnTo}?review=submitted`);
}
