export const VENDOR_CATEGORIES = [
  "Bakery",
  "Catering",
  "Decor",
  "DJ",
  "Entertainment",
  "Rentals",
  "Venue",
] as const;

export const PLANNER_SERVICES = [
  "Consultation",
  "Vendor sourcing",
  "Budget planning",
  "Day-of coordination",
  "Full-service planning",
] as const;

export const MARKETPLACE_LEAD_STATUSES = ["new", "contacted", "quoted", "won", "lost"] as const;

export const MARKETPLACE_PROVIDER_STATUSES = ["active", "paused", "pending_review"] as const;

export type VendorCategory = (typeof VENDOR_CATEGORIES)[number];

export type VendorPricingModel = "fixed_packages" | "custom_quotes" | "affiliate_links";

export type MarketplaceStatus = (typeof MARKETPLACE_PROVIDER_STATUSES)[number];

export type MarketplaceLeadStatus = (typeof MARKETPLACE_LEAD_STATUSES)[number];

export type VendorProfile = {
  id: string;
  ownerId: string;
  businessName: string;
  slug: string;
  category: string;
  city: string;
  state: string | null;
  zipCode: string;
  serviceRadiusMiles: number;
  contactName: string | null;
  contactEmail: string;
  contactPhone: string | null;
  websiteUrl: string | null;
  affiliateUrl: string | null;
  pricingModel: VendorPricingModel;
  startingPrice: number | null;
  description: string;
  portfolioUrls: string[];
  status: MarketplaceStatus;
  isVerified: boolean;
  createdAt: string;
};

export type PlannerProfile = {
  id: string;
  ownerId: string;
  businessName: string;
  slug: string;
  city: string;
  state: string | null;
  zipCode: string;
  serviceRadiusMiles: number;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  websiteUrl: string | null;
  yearsExperience: number | null;
  certifications: string | null;
  consultationPrice: number | null;
  hourlyRate: number | null;
  fullServiceMinimum: number | null;
  bio: string;
  services: string[];
  availabilityNote: string | null;
  status: MarketplaceStatus;
  isVerified: boolean;
  createdAt: string;
};

export type MarketplaceLead = {
  id: string;
  leadType: "vendor" | "planner_consultation" | "planner_full_service";
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  eventType: string | null;
  eventDate: string | null;
  eventZipCode: string | null;
  budget: number | null;
  message: string;
  status: "new" | "contacted" | "quoted" | "won" | "lost";
  createdAt: string;
};
