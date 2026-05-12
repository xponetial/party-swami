import type { EventIntelligenceContext } from "@/features/event-intelligence/types";

const SERVICE_TO_VENDOR_CATEGORY: Record<string, string> = {
  catering: "Catering",
  bakery: "Bakery",
  photographer: "Photography",
  videographer: "Videography",
  dj: "DJ",
  "live music": "Live Music",
  decorator: "Decor",
  florist: "Florist",
  venue: "Venue",
  bartender: "Bartender",
  rentals: "Rentals",
  "party planner": "Planner",
  "cleaning service": "Cleaning",
  transportation: "Transportation",
  security: "Security",
  valet: "Valet",
};

export function getVendorCategoriesFromServices(services: string[]) {
  const categories = new Set<string>();
  for (const service of services) {
    const mapped = SERVICE_TO_VENDOR_CATEGORY[service.trim().toLowerCase()];
    if (mapped) categories.add(mapped);
  }
  return [...categories];
}

export function getShoppingSearchTermsFromIntake(context: EventIntelligenceContext) {
  const terms = new Set<string>();
  context.servicesRequested.forEach((service) => terms.add(service));
  context.food.cuisinePreferences.forEach((cuisine) => terms.add(cuisine));
  context.food.dietaryRestrictions.forEach((restriction) => terms.add(restriction));
  if (context.childrenAttending) terms.add("kids activities");
  if (context.bar.signatureDrinks) terms.add("signature drink supplies");
  if (context.bar.byob) terms.add("drink coolers");
  return [...terms];
}
