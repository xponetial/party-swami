import OpenAI from "openai";
import { z } from "zod";

type EventSeed = {
  title: string;
  event_type: string;
  event_date: string | null;
  location: string | null;
  guest_target: number | null;
  budget: number | null;
  theme: string | null;
};

type GeneratedShoppingItem = {
  category: string;
  name: string;
  quantity: number;
  estimated_price: number | null;
  recommendation_reason: string;
  search_query: string;
  image_url: string | null;
  external_url: string | null;
};

export type GeneratedPartyPlan = {
  theme: string;
  inviteCopy: string;
  menu: string[];
  shoppingCategories: Array<{
    category: string;
    items: Array<{
      name: string;
      quantity: number;
    }>;
  }>;
  shoppingItems: GeneratedShoppingItem[];
  tasks: Array<{
    title: string;
    due_label: string;
    phase: string;
  }>;
  timeline: Array<{
    label: string;
    detail: string;
    sort_order: number;
  }>;
  rawResponse: {
    provider: string;
    generatedAt: string;
    summary: string;
    model?: string;
    promptVersion?: string;
    usage?: AiUsageMetadata;
  };
};

export type AiGenerationType =
  | "party_plan"
  | "plan_revision"
  | "invitation_text"
  | "shopping_list_transform"
  | "social_campaign"
  | "social_content_regeneration"
  | "premium_concierge";

export type AiUsageMetadata = {
  model: string;
  promptVersion: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  estimatedCostUsd: number;
  latencyMs: number;
  provider: string;
  usedFallback: boolean;
};

type InviteContext = {
  title?: string | null;
  subtitle?: string | null;
  dateText?: string | null;
  locationText?: string | null;
  currentMessage?: string | null;
};

type ShoppingGenerationContext = {
  planTheme?: string | null;
  menu?: string[] | null;
  shoppingCategories?: Array<{
    category: string;
    items: Array<{ name: string; quantity: number }>;
  }> | null;
};

type ShoppingReplacementContext = ShoppingGenerationContext & {
  existingCategoryNames?: string[] | null;
  feedback?: "general" | "too_expensive" | "not_my_style";
};

export type SocialBrandProfileContext = {
  tone: string;
  audience: string;
  signaturePhrases: string;
  ctaStyle: string;
  focusMetrics: string;
  postingGoalPerWeek: number;
};

type SocialCampaignGenerationInput = {
  theme: string;
  sourceEventType?: string | null;
  audienceHint?: string | null;
  objectiveHint?: string | null;
};

type SocialContentGenerationInput = {
  theme: string;
  channel: "tiktok" | "pinterest" | "instagram" | "email" | "landing_page";
  audience: string;
  objective: string;
  notes?: string | null;
};

type GeneratedSocialContentItem = {
  channel: "tiktok" | "pinterest" | "instagram" | "email" | "landing_page";
  title: string;
  formatDetail: string;
  copy: string;
  callToAction: string;
  hashtags: string;
  visualDirection: string;
  publishOffsetDays: number;
};

export type GeneratedSocialCampaign = {
  audience: string;
  objective: string;
  priority: "low" | "medium" | "high";
  sourceEventType: string | null;
  notes: string;
  contentItems: GeneratedSocialContentItem[];
  rawResponse: {
    provider: string;
    generatedAt: string;
    summary: string;
    model?: string;
    promptVersion?: string;
    usage?: AiUsageMetadata;
  };
};

type ReplacementCandidate = Omit<GeneratedShoppingItem, "external_url"> & {
  external_url?: string | null;
};

const generatedTaskSchema = z.object({
  title: z.string().min(3),
  due_label: z.string().min(2),
  phase: z.string().min(2),
});

const generatedTimelineSchema = z.object({
  label: z.string().min(2),
  detail: z.string().min(4),
  sort_order: z.number().int().min(1),
});

const generatedShoppingItemSchema = z.object({
  category: z.string().min(2),
  name: z.string().min(2),
  quantity: z.number().int().min(1),
  estimated_price: z.number().min(0).nullable(),
  recommendation_reason: z.string().min(12),
  search_query: z.string().min(3),
  image_url: z.string().url().nullable(),
  external_url: z.string().url().nullable(),
});

const generatedShoppingCategorySchema = z.object({
  category: z.string().min(2),
  items: z.array(
    z.object({
      name: z.string().min(2),
      quantity: z.number().int().min(1),
    }),
  ).min(1),
});

const generatedPartyPlanSchema = z.object({
  theme: z.string().min(3),
  inviteCopy: z.string().min(20),
  menu: z.array(z.string().min(2)).min(3),
  shoppingCategories: z.array(generatedShoppingCategorySchema).min(2),
  shoppingItems: z.array(generatedShoppingItemSchema).min(3),
  tasks: z.array(generatedTaskSchema).min(4),
  timeline: z.array(generatedTimelineSchema).min(4),
});

const generatedInviteCopySchema = z.object({
  inviteCopy: z.string().min(20),
});

const generatedShoppingListSchema = z.object({
  shoppingItems: z.array(generatedShoppingItemSchema).min(3),
  shoppingCategories: z.array(generatedShoppingCategorySchema).min(2),
});

const generatedSocialContentItemSchema = z.object({
  channel: z.enum(["tiktok", "pinterest", "instagram", "email", "landing_page"]),
  title: z.string().min(6).max(120),
  formatDetail: z.string().min(6).max(240),
  copy: z.string().min(40).max(4000),
  callToAction: z.string().min(2).max(240),
  hashtags: z.string().min(2).max(500),
  visualDirection: z.string().min(8).max(1200),
  publishOffsetDays: z.number().int().min(0).max(30),
});

const generatedSocialCampaignSchema = z.object({
  audience: z.string().min(3).max(200),
  objective: z.string().min(3).max(200),
  priority: z.enum(["low", "medium", "high"]),
  sourceEventType: z.string().min(2).max(120).nullable(),
  notes: z.string().min(10).max(1500),
  contentItems: z.array(generatedSocialContentItemSchema).min(5).max(7),
});

type AiTaskType = "plan" | "lightweight" | "premium";
const PROMPT_VERSIONS: Record<AiGenerationType, string> = {
  party_plan: "party-plan-v2",
  plan_revision: "plan-revision-v1",
  invitation_text: "invitation-text-v2",
  shopping_list_transform: "shopping-list-v2",
  social_campaign: "social-campaign-v1",
  social_content_regeneration: "social-content-regeneration-v1",
  premium_concierge: "premium-concierge-v1",
};
const MODEL_PRICING: Record<
  string,
  { input: number; cachedInput: number; output: number }
> = {
  "gpt-5.4-nano": { input: 0.2, cachedInput: 0.02, output: 1.25 },
  "gpt-5.4-mini": { input: 0.75, cachedInput: 0.075, output: 4.5 },
  "gpt-5.4": { input: 2.5, cachedInput: 0.25, output: 15 },
};

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
}

function getOpenAIModel(taskType: AiTaskType) {
  if (taskType === "plan") {
    return (
      process.env.OPENAI_MODEL_PLAN?.trim() ||
      process.env.OPENAI_MODEL_MINI?.trim() ||
      "gpt-5.4-mini"
    );
  }

  if (taskType === "premium") {
    return (
      process.env.OPENAI_MODEL_PREMIUM?.trim() ||
      process.env.OPENAI_MODEL_FULL?.trim() ||
      "gpt-5.4"
    );
  }

  return (
    process.env.OPENAI_MODEL_LIGHTWEIGHT?.trim() ||
    process.env.OPENAI_MODEL_NANO?.trim() ||
    "gpt-5.4-nano"
  );
}

function getPromptVersion(generationType: AiGenerationType) {
  return PROMPT_VERSIONS[generationType];
}

function estimateCostUsd({
  model,
  inputTokens,
  outputTokens,
  cachedInputTokens,
}: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
}) {
  const pricing = MODEL_PRICING[model];

  if (!pricing) {
    return 0;
  }

  const uncachedInputTokens = Math.max(0, inputTokens - cachedInputTokens);

  return Number(
    (
      (uncachedInputTokens / 1_000_000) * pricing.input +
      (cachedInputTokens / 1_000_000) * pricing.cachedInput +
      (outputTokens / 1_000_000) * pricing.output
    ).toFixed(6),
  );
}

function getBudgetLabel(event: EventSeed) {
  return event.budget == null ? "Flexible budget" : `$${event.budget}`;
}

function getGuestCount(event: EventSeed) {
  return event.guest_target ?? 12;
}

function getTheme(event: EventSeed) {
  return event.theme?.trim() || `${event.event_type} celebration`;
}

function getBudgetTier(event: EventSeed) {
  if (event.budget == null) {
    return "flexible";
  }

  if (event.budget <= 100) {
    return "lean";
  }

  if (event.budget <= 250) {
    return "moderate";
  }

  return "premium";
}

function toTitleCase(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildAmazonSearchUrl(query: string) {
  return `https://www.amazon.com/s?k=${encodeURIComponent(query.trim())}`;
}

const SOCIAL_CHANNEL_ORDER = [
  "tiktok",
  "pinterest",
  "instagram",
  "email",
  "landing_page",
] as const;

function normalizeSocialTheme(value: string) {
  return value.trim() || "Party Swami seasonal campaign";
}

function buildSocialContentFallbackItem(
  channel: (typeof SOCIAL_CHANNEL_ORDER)[number],
  theme: string,
  brandProfile: SocialBrandProfileContext,
): GeneratedSocialContentItem {
  const normalizedTheme = normalizeSocialTheme(theme);
  const signaturePhrase = brandProfile.signaturePhrases.split(",")[0]?.trim() || "party-worthy";
  const cta = brandProfile.ctaStyle.split(",")[0]?.trim() || "Save this idea";

  const base = {
    hashtags: "#partyideas #hostingtips #partygenie",
    visualDirection: `Use bright, polished lifestyle visuals that feel ${brandProfile.tone.toLowerCase()} and show a ${signaturePhrase.toLowerCase()} version of ${normalizedTheme.toLowerCase()}.`,
  };

  switch (channel) {
    case "tiktok":
      return {
        channel,
        title: `${normalizedTheme}: 3 fast host hooks`,
        formatDetail: "Short-form video concept with hook, scene beats, and fast payoff",
        copy: `Hook: planning ${normalizedTheme.toLowerCase()} does not have to feel overwhelming. Show three quick upgrades that make the setup feel finished, guest-ready, and easy to shop. Close by reinforcing that hosts can make the whole celebration feel intentional without overcomplicating it.`,
        callToAction: cta,
        publishOffsetDays: 0,
        ...base,
      };
    case "pinterest":
      return {
        channel,
        title: `${normalizedTheme} inspiration board`,
        formatDetail: "Pin title, save-focused description, and affiliate-friendly angle",
        copy: `Pin this ${normalizedTheme.toLowerCase()} setup for your next celebration. Focus on decor, table styling, and host shortcuts that keep the event easy to pull together while still looking elevated.`,
        callToAction: "Save this for later",
        publishOffsetDays: 1,
        ...base,
      };
    case "instagram":
      return {
        channel,
        title: `${normalizedTheme} carousel caption`,
        formatDetail: "Carousel post with 4 to 6 frames and a save-first CTA",
        copy: `Hosts looking for a ${normalizedTheme.toLowerCase()} can keep it simple: start with a strong table moment, layer in easy food wins, and finish with one or two details that make the whole gathering feel memorable. This is the kind of celebration that looks polished without becoming stressful.`,
        callToAction: "Save this for your next party",
        publishOffsetDays: 2,
        ...base,
      };
    case "email":
      return {
        channel,
        title: `${normalizedTheme} email teaser`,
        formatDetail: "Subject line direction and short teaser body copy",
        copy: `Subject line idea: ${normalizedTheme} ideas hosts can use this week. Teaser copy: here is a faster way to style the party, tighten the guest experience, and turn the event into something people want to copy.`,
        callToAction: "Open the full guide",
        publishOffsetDays: 3,
        ...base,
      };
    case "landing_page":
      return {
        channel,
        title: `${normalizedTheme} landing page hero`,
        formatDetail: "Hero copy, support text, and conversion-focused CTA",
        copy: `Headline direction: make your ${normalizedTheme.toLowerCase()} feel guest-ready fast. Support copy should frame Party Swami as the shortcut to planning, invites, inspiration, and shopping momentum in one place.`,
        callToAction: "Plan your version",
        publishOffsetDays: 4,
        ...base,
      };
  }
}

function normalizeGeneratedSocialContentItems(
  items: GeneratedSocialContentItem[],
  theme: string,
  brandProfile: SocialBrandProfileContext,
) {
  const itemByChannel = new Map<
    GeneratedSocialContentItem["channel"],
    GeneratedSocialContentItem
  >();

  for (const item of items) {
    if (!itemByChannel.has(item.channel)) {
      itemByChannel.set(item.channel, item);
    }
  }

  return SOCIAL_CHANNEL_ORDER.map(
    (channel) =>
      itemByChannel.get(channel) ??
      buildSocialContentFallbackItem(channel, theme, brandProfile),
  );
}

function normalizeSingleSocialContentItem(
  item: GeneratedSocialContentItem | null,
  input: SocialContentGenerationInput,
  brandProfile: SocialBrandProfileContext,
) {
  return (
    item ??
    buildSocialContentFallbackItem(input.channel, input.theme, brandProfile)
  );
}

function normalizeAmazonRecommendation(item: Omit<GeneratedShoppingItem, "external_url"> & { external_url?: string | null }) {
  const searchQuery = item.search_query.trim();

  return {
    ...item,
    search_query: searchQuery,
    external_url: item.external_url?.trim() || buildAmazonSearchUrl(searchQuery),
  };
}

function getEventMoment(event: EventSeed) {
  if (!event.event_date) {
    return "an upcoming gathering";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(event.event_date));
}

function getMenuSuggestions(event: EventSeed) {
  const type = event.event_type.toLowerCase();

  if (type.includes("brunch")) {
    return ["Seasonal fruit board", "Mini quiches", "Sparkling citrus mocktail"];
  }

  if (type.includes("birthday")) {
    return ["Signature welcome drink", "Crowd-pleasing small bites", "Celebration cake"];
  }

  if (type.includes("dinner")) {
    return ["Cheese and crudite starter", "Family-style main course", "Mini dessert trio"];
  }

  return ["Welcome snack board", "Main shared spread", "Dessert station"];
}

function dedupeShoppingItems(items: GeneratedShoppingItem[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = `${item.category.toLowerCase()}::${item.name.toLowerCase()}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function normalizeComparisonTokens(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(
      (token) =>
        token.length > 2 &&
        ![
          "pack",
          "set",
          "kit",
          "party",
          "bundle",
          "host",
          "event",
          "extras",
          "pieces",
          "piece",
        ].includes(token),
    );
}

function isNameTooSimilar(candidateName: string, blockedNames: string[]) {
  const candidateTokens = normalizeComparisonTokens(candidateName);

  return blockedNames.some((blockedName) => {
    const blockedTokens = normalizeComparisonTokens(blockedName);

    if (!blockedTokens.length || !candidateTokens.length) {
      return candidateName.trim().toLowerCase() === blockedName.trim().toLowerCase();
    }

    const sharedTokens = candidateTokens.filter((token) => blockedTokens.includes(token));
    return sharedTokens.length >= Math.min(2, blockedTokens.length);
  });
}

function buildReplacementAngles(category: string) {
  const normalizedCategory = category.trim().toLowerCase();

  if (normalizedCategory.includes("beverage") || normalizedCategory.includes("drink")) {
    return [
      "garnish and presentation",
      "cooling and serving",
      "self-serve station accessories",
    ];
  }

  if (normalizedCategory.includes("decor")) {
    return ["lighting and glow", "signage and welcome moment", "table styling accents"];
  }

  if (normalizedCategory.includes("table") || normalizedCategory.includes("serve")) {
    return ["guest place settings", "serving flow", "cleanup and reset support"];
  }

  if (normalizedCategory.includes("food") || normalizedCategory.includes("dessert")) {
    return ["display and presentation", "snack service", "dessert moment"];
  }

  if (normalizedCategory.includes("hosting")) {
    return ["setup support", "hosting convenience", "guest comfort"];
  }

  if (normalizedCategory.includes("activity") || normalizedCategory.includes("favor")) {
    return ["interactive fun", "take-home keepsake", "photo moment"];
  }

  return ["different shopping angle", "host convenience", "guest experience"];
}

function buildReplacementPool(
  event: EventSeed,
  currentItem: {
    category: string;
    name: string;
    quantity: number;
  },
  context?: ShoppingReplacementContext,
): ReplacementCandidate[] {
  const theme = (context?.planTheme?.trim() || getTheme(event)).trim();
  const category = currentItem.category.trim();
  const normalizedCategory = category.toLowerCase();
  const guestCount = getGuestCount(event);
  const budgetTier = getBudgetTier(event);
  const wantsLowerCost = context?.feedback === "too_expensive";
  const wantsDifferentStyle = context?.feedback === "not_my_style";

  if (normalizedCategory.includes("beverage") || normalizedCategory.includes("drink")) {
    return [
      {
        category,
        name: "Signature drink garnish and glass marker set",
        quantity: Math.max(1, Math.ceil(guestCount / 12)),
        estimated_price: wantsLowerCost ? 10 : budgetTier === "lean" ? 12 : 18,
        recommendation_reason:
          "Shifts the beverage setup toward presentation and guest convenience instead of repeating another dispenser-style add-on.",
        search_query: `${theme} party drink garnish tray glass markers`,
        image_url: null,
      },
      {
        category,
        name: "Ice bucket and insulated beverage tub station",
        quantity: Math.max(1, Math.ceil(guestCount / 16)),
        estimated_price: wantsLowerCost ? 14 : budgetTier === "lean" ? 16 : 24,
        recommendation_reason:
          "Covers the cooling side of the drink setup so guests can serve themselves without the host constantly refreshing the station.",
        search_query: `${theme} party beverage tub ice bucket set`,
        image_url: null,
      },
      {
        category,
        name: "Mocktail syrup and mixer sampler",
        quantity: Math.max(1, Math.ceil(guestCount / 18)),
        estimated_price: wantsLowerCost ? 12 : budgetTier === "lean" ? 14 : 22,
        recommendation_reason:
          "Adds variety at the bar area and gives the host a more guest-facing beverage upgrade than another accessory pack.",
        search_query: `${theme} party mocktail mixer sampler`,
        image_url: null,
      },
    ];
  }

  if (normalizedCategory.includes("decor")) {
    return [
      {
        category,
        name: wantsDifferentStyle ? "Statement welcome sign and entry decor set" : "Ambient string light and lantern bundle",
        quantity: Math.max(1, Math.ceil(guestCount / 16)),
        estimated_price: wantsLowerCost ? 14 : budgetTier === "lean" ? 18 : 28,
        recommendation_reason:
          "Pushes the decor toward lighting and atmosphere so the space feels more finished than another tabletop-only accent.",
        search_query: wantsDifferentStyle
          ? `${theme} party welcome sign entry decor`
          : `${theme} party string lights lantern decor`,
        image_url: null,
      },
      {
        category,
        name: wantsDifferentStyle ? "Patterned table runner and layered placemat set" : "Welcome sign and entry styling kit",
        quantity: 1,
        estimated_price: wantsLowerCost ? 12 : budgetTier === "lean" ? 15 : 24,
        recommendation_reason:
          "Creates a stronger first impression for guests by improving the arrival moment instead of repeating interior decor pieces.",
        search_query: wantsDifferentStyle
          ? `${theme} party table runner placemat decor`
          : `${theme} party welcome sign entry decor`,
        image_url: null,
      },
      {
        category,
        name: "Centerpiece and tabletop styling mix",
        quantity: Math.max(1, Math.ceil(guestCount / 10)),
        estimated_price: wantsLowerCost ? 12 : budgetTier === "lean" ? 16 : 22,
        recommendation_reason:
          "Keeps the theme visible at eye level while giving you a different table styling direction from the current decor pick.",
        search_query: `${theme} party centerpiece table accents`,
        image_url: null,
      },
    ];
  }

  if (normalizedCategory.includes("table") || normalizedCategory.includes("serve")) {
    return [
      {
        category,
        name: "Disposable charger and serving tray combo",
        quantity: Math.max(1, Math.ceil(guestCount / 14)),
        estimated_price: wantsLowerCost ? 11 : budgetTier === "lean" ? 14 : 20,
        recommendation_reason:
          "Moves the tableware recommendation toward presentation and buffet flow instead of repeating cups or napkins.",
        search_query: `${theme} party charger plates serving tray set`,
        image_url: null,
      },
      {
        category,
        name: "Napkin caddy and utensil organizer set",
        quantity: 1,
        estimated_price: wantsLowerCost ? 10 : budgetTier === "lean" ? 12 : 18,
        recommendation_reason:
          "Makes the service area easier for guests to navigate and supports cleaner setup without overbuying more place settings.",
        search_query: `${theme} party napkin caddy utensil organizer`,
        image_url: null,
      },
      {
        category,
        name: "Serving spoon and tong host bundle",
        quantity: 1,
        estimated_price: wantsLowerCost ? 8 : budgetTier === "lean" ? 10 : 16,
        recommendation_reason:
          "Covers the practical tools hosts often realize they are missing once food service starts.",
        search_query: `${theme} party serving spoons tongs set`,
        image_url: null,
      },
    ];
  }

  if (normalizedCategory.includes("food") || normalizedCategory.includes("dessert")) {
    return [
      {
        category,
        name: "Dessert display stand and riser set",
        quantity: 1,
        estimated_price: wantsLowerCost ? 14 : budgetTier === "lean" ? 18 : 26,
        recommendation_reason:
          "Shifts the food recommendation toward presentation so the spread looks more intentional without changing the whole menu.",
        search_query: `${theme} party dessert stand risers`,
        image_url: null,
      },
      {
        category,
        name: "Snack bowl and grazing board bundle",
        quantity: 1,
        estimated_price: wantsLowerCost ? 12 : budgetTier === "lean" ? 16 : 24,
        recommendation_reason:
          "Supports a more casual self-serve food moment if you want guests to graze instead of clustering around one serving area.",
        search_query: `${theme} party snack bowls grazing board set`,
        image_url: null,
      },
      {
        category,
        name: "Cupcake and treat wrapper assortment",
        quantity: Math.max(1, Math.ceil(guestCount / 18)),
        estimated_price: wantsLowerCost ? 8 : budgetTier === "lean" ? 10 : 15,
        recommendation_reason:
          "Gives the dessert station a cleaner finish and helps smaller sweets feel easier to serve and photograph.",
        search_query: `${theme} dessert wrappers treat stand party`,
        image_url: null,
      },
    ];
  }

  if (normalizedCategory.includes("hosting")) {
    return [
      {
        category,
        name: "Trash concealment and cleanup station kit",
        quantity: 1,
        estimated_price: wantsLowerCost ? 9 : budgetTier === "lean" ? 12 : 18,
        recommendation_reason:
          "Improves host flow behind the scenes and solves the cleanup pain point guests notice when bins are missing or messy.",
        search_query: `${theme} party trash bag holder cleanup station`,
        image_url: null,
      },
      {
        category,
        name: "Guest comfort basket and restroom refresh set",
        quantity: 1,
        estimated_price: wantsLowerCost ? 11 : budgetTier === "lean" ? 14 : 22,
        recommendation_reason:
          "Adds a thoughtful host touch that feels different from the core party setup while still helping the event run smoothly.",
        search_query: `${theme} guest bathroom basket party hosting`,
        image_url: null,
      },
      {
        category,
        name: "Extension cord and setup utility bundle",
        quantity: 1,
        estimated_price: wantsLowerCost ? 10 : budgetTier === "lean" ? 14 : 20,
        recommendation_reason:
          "Keeps the setup practical if you are running lights, music, or warming pieces and need one host-side support pick.",
        search_query: `${theme} party extension cord setup kit`,
        image_url: null,
      },
    ];
  }

  if (normalizedCategory.includes("activity") || normalizedCategory.includes("favor")) {
    return [
      {
        category,
        name: wantsDifferentStyle ? "Keepsake favor tag and packaging set" : "Photo booth prop and guest sign bundle",
        quantity: 1,
        estimated_price: wantsLowerCost ? 10 : budgetTier === "lean" ? 14 : 22,
        recommendation_reason:
          "Creates a more interactive guest moment if you want an alternate from the current activity or favor direction.",
        search_query: wantsDifferentStyle
          ? `${theme} party favor tags packaging set`
          : `${theme} party photo booth props guest signs`,
        image_url: null,
      },
      {
        category,
        name: "Take-home favor packaging kit",
        quantity: Math.max(1, Math.ceil(guestCount / 16)),
        estimated_price: wantsLowerCost ? 9 : budgetTier === "lean" ? 12 : 18,
        recommendation_reason:
          "Switches the emphasis from in-event activity to a simple take-home finish that still feels personal.",
        search_query: `${theme} party favor boxes bags set`,
        image_url: null,
      },
      {
        category,
        name: "Conversation starter card and table game set",
        quantity: Math.max(1, Math.ceil(guestCount / 20)),
        estimated_price: wantsLowerCost ? 8 : budgetTier === "lean" ? 10 : 16,
        recommendation_reason:
          "Gives guests something easy to engage with without needing a bigger activity setup or more space.",
        search_query: `${theme} party conversation cards table game`,
        image_url: null,
      },
    ];
  }

  return [
    {
      category,
      name: `${toTitleCase(category)} alternate host pick`,
      quantity: Math.max(1, currentItem.quantity),
      estimated_price: budgetTier === "lean" ? 12 : 18,
      recommendation_reason:
        "This alternate keeps the category covered while giving you a different shopping direction from the current pick.",
      search_query: `${theme} ${category} party host recommendation`,
      image_url: null,
    },
  ];
}

function getShoppingItems(event: EventSeed, context?: ShoppingGenerationContext): GeneratedShoppingItem[] {
  const guestCount = getGuestCount(event);
  const type = event.event_type.toLowerCase();
  const theme = (context?.planTheme?.trim() || getTheme(event)).trim();
  const budgetTier = getBudgetTier(event);
  const isPoolParty =
    type.includes("pool") || theme.toLowerCase().includes("pool");
  const isPatriotic =
    theme.toLowerCase().includes("stars") ||
    theme.toLowerCase().includes("sparklers") ||
    theme.toLowerCase().includes("4th") ||
    theme.toLowerCase().includes("july");
  const menu = context?.menu?.filter(Boolean) ?? [];
  const categoryHints = context?.shoppingCategories ?? [];

  const baseItems: GeneratedShoppingItem[] = [
    normalizeAmazonRecommendation({
      category: "Decor",
      name: isPatriotic ? "Patriotic table accent set" : "Theme-forward table accent set",
      quantity: Math.max(2, Math.ceil(guestCount / 6)),
      estimated_price: budgetTier === "lean" ? 14 : 18,
      recommendation_reason: `Adds a quick visual lift and helps the ${theme.toLowerCase()} setup feel intentional right away.`,
      search_query: `${theme} party table decor set`,
      image_url: null,
    }),
    normalizeAmazonRecommendation({
      category: "Tableware",
      name: isPoolParty ? "Outdoor-safe plate and cup bundle" : "Guest-ready napkin and tabletop bundle",
      quantity: Math.max(1, Math.ceil(guestCount / 12)),
      estimated_price: budgetTier === "lean" ? 14 : 16,
      recommendation_reason: guestCount
        ? `Sized to support about ${guestCount} guests without making you piece together basics one by one.`
        : "Covers the practical hosting basics without making you hunt through multiple listings.",
      search_query: `${theme} party tableware set for ${guestCount} guests`,
      image_url: null,
    }),
    normalizeAmazonRecommendation({
      category: "Beverages",
      name: isPoolParty ? "Drink station extras and cooler setup pack" : "Drink station extras and mixers pack",
      quantity: Math.max(2, Math.ceil(guestCount / 8)),
      estimated_price: 14,
      recommendation_reason: "Supports an easy self-serve drink setup so the host is not stuck refilling the station all event.",
      search_query: isPoolParty
        ? `${theme} pool party cooler drink dispenser accessories`
        : `${theme} party drink dispenser accessories mixers`,
      image_url: null,
    }),
  ];

  if (type.includes("dinner")) {
    baseItems.push(
      normalizeAmazonRecommendation({
        category: "Food",
        name: "Family-style servingware set",
        quantity: 1,
        estimated_price: 42,
        recommendation_reason: "Makes it easier to serve a dinner crowd cleanly and keeps the table feeling coordinated.",
        search_query: `family style serving bowls platter set dinner party`,
        image_url: null,
      }),
      normalizeAmazonRecommendation({
        category: "Food",
        name: "Dessert stand or display tray",
        quantity: 1,
        estimated_price: 24,
        recommendation_reason: "Gives the dessert moment more presence without adding much complexity to the setup.",
        search_query: `dessert stand display tray party`,
        image_url: null,
      }),
    );
  } else if (type.includes("birthday")) {
    baseItems.push(
      normalizeAmazonRecommendation({
        category: "Decor",
        name: "Celebration cake topper and candle set",
        quantity: 1,
        estimated_price: 14,
        recommendation_reason: "Adds a birthday-specific finish and works well even if the cake itself comes from somewhere else.",
        search_query: `${theme} birthday cake topper candles`,
        image_url: null,
      }),
      normalizeAmazonRecommendation({
        category: "Decor",
        name: "Photo backdrop or balloon statement kit",
        quantity: 1,
        estimated_price: 28,
        recommendation_reason: "Creates the visual focal point most birthday hosts want for photos and arrival impact.",
        search_query: `${theme} birthday balloon arch backdrop kit`,
        image_url: null,
      }),
    );
  } else {
    baseItems.push(normalizeAmazonRecommendation({
      category: "Food",
      name: "Shareable appetizer and snack serving set",
      quantity: Math.max(2, Math.ceil(guestCount / 8)),
      estimated_price: 20,
      recommendation_reason: "Helps the food setup feel ready for guests without requiring a more formal catering setup.",
      search_query: `${event.event_type} appetizer serving set party`,
      image_url: null,
    }));
  }

  if (isPoolParty) {
    baseItems.push(
      normalizeAmazonRecommendation({
        category: "Upgrades",
        name: "Poolside towel and sunscreen station basket",
        quantity: Math.max(1, Math.ceil(guestCount / 16)),
        estimated_price: budgetTier === "premium" ? 34 : 22,
        recommendation_reason: "This makes a pool party feel more hosted and solves the practical guest needs people notice immediately.",
        search_query: `${theme} pool party towel sunscreen basket`,
        image_url: null,
      }),
      normalizeAmazonRecommendation({
        category: "Activities",
        name: "Inflatable pool game bundle",
        quantity: 1,
        estimated_price: budgetTier === "lean" ? 18 : 26,
        recommendation_reason: "Adds an easy activity layer so the event feels more than just standing around the water.",
        search_query: `${theme} pool party inflatable game set`,
        image_url: null,
      }),
    );
  }

  if (isPatriotic) {
    baseItems.push(
      normalizeAmazonRecommendation({
        category: "Decor",
        name: "Stars and stripes string light or bunting kit",
        quantity: 1,
        estimated_price: 22,
        recommendation_reason: "Leans into the patriotic theme more clearly than generic party decor and gives the setup better nighttime payoff.",
        search_query: `${theme} patriotic string lights bunting party`,
        image_url: null,
      }),
    );
  }

  for (const category of categoryHints) {
    const existingNames = new Set(baseItems.map((item) => item.name.toLowerCase()));

    for (const hintedItem of category.items.slice(0, 2)) {
      if (existingNames.has(hintedItem.name.toLowerCase())) {
        continue;
      }

      baseItems.push(
        normalizeAmazonRecommendation({
          category: category.category,
          name: hintedItem.name,
          quantity: hintedItem.quantity,
          estimated_price: null,
          recommendation_reason: `This came directly from the existing ${category.category.toLowerCase()} plan, so the shopping page stays aligned with the rest of the event workflow.`,
          search_query: `${theme} ${hintedItem.name} amazon`,
          image_url: null,
        }),
      );
      existingNames.add(hintedItem.name.toLowerCase());
    }
  }

  if (menu.length) {
    const menuTarget = menu[0];
    baseItems.push(
      normalizeAmazonRecommendation({
        category: "Hosting",
        name: "Serving pieces for the featured food setup",
        quantity: 1,
        estimated_price: budgetTier === "lean" ? 16 : 24,
        recommendation_reason: `Supports the menu plan, especially if you are serving ${menuTarget.toLowerCase()}.`,
        search_query: `${theme} serving set for ${menuTarget}`,
        image_url: null,
      }),
    );
  }

  return dedupeShoppingItems(baseItems).slice(0, 8);
}

function toShoppingCategories(items: GeneratedShoppingItem[]) {
  const grouped = new Map<string, Array<{ name: string; quantity: number }>>();

  for (const item of items) {
    const current = grouped.get(item.category) ?? [];
    current.push({ name: item.name, quantity: item.quantity });
    grouped.set(item.category, current);
  }

  return Array.from(grouped.entries()).map(([category, groupedItems]) => ({
    category,
    items: groupedItems,
  }));
}

function eventBrief(event: EventSeed) {
  return [
    `Title: ${event.title}`,
    `Type: ${event.event_type}`,
    `Theme: ${getTheme(event)}`,
    `Date: ${getEventMoment(event)}`,
    `Location: ${event.location ?? "TBD"}`,
    `Guest target: ${getGuestCount(event)}`,
    `Budget: ${getBudgetLabel(event)}`,
  ].join("\n");
}

function extractJsonObject(rawText: string) {
  const start = rawText.indexOf("{");
  const end = rawText.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("The AI response did not contain valid JSON.");
  }

  return JSON.parse(rawText.slice(start, end + 1));
}

async function generateStructuredObject<T>({
  generationType,
  taskType,
  systemPrompt,
  userPrompt,
  schema,
}: {
  generationType: AiGenerationType;
  taskType: AiTaskType;
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodSchema<T>;
}) {
  const client = getOpenAIClient();

  if (!client) {
    return null;
  }

  const model = getOpenAIModel(taskType);
  const startedAt = Date.now();
  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: `${systemPrompt}\nReturn only JSON with no markdown fences.`,
          },
        ],
      },
      {
        role: "user",
        content: [{ type: "input_text", text: userPrompt }],
      },
    ],
  });
  const inputTokens = response.usage?.input_tokens ?? 0;
  const outputTokens = response.usage?.output_tokens ?? 0;
  const cachedInputTokens =
    response.usage?.input_tokens_details?.cached_tokens ?? 0;
  const promptVersion = getPromptVersion(generationType);

  const parsed = schema.parse(extractJsonObject(response.output_text));

  return {
    data: parsed,
    usage: {
      model,
      promptVersion,
      inputTokens,
      outputTokens,
      cachedInputTokens,
      estimatedCostUsd: estimateCostUsd({
        model,
        inputTokens,
        outputTokens,
        cachedInputTokens,
      }),
      latencyMs: Date.now() - startedAt,
      provider: "openai-responses",
      usedFallback: false,
    },
  };
}

export function buildPartyPlan(event: EventSeed): GeneratedPartyPlan {
  const theme = getTheme(event);
  const guestCount = getGuestCount(event);
  const eventMoment = getEventMoment(event);
  const menu = getMenuSuggestions(event);
  const shoppingItems = getShoppingItems(event);

  return {
    theme,
    inviteCopy: `You're invited to ${event.title} on ${eventMoment}. Expect a ${theme.toLowerCase()} with thoughtful details, great food, and an easy RSVP flow for ${guestCount} guests.`,
    menu,
    shoppingCategories: toShoppingCategories(shoppingItems),
    shoppingItems,
    tasks: [
      { title: "Review and personalize the AI invite copy", due_label: "Today", phase: "pre-event" },
      { title: "Finalize the shopping list and retailer handoff", due_label: "This week", phase: "pre-event" },
      { title: "Send reminders to pending guests", due_label: "Event week", phase: "event-week" },
      { title: "Prep the hosting setup checklist", due_label: "Day before", phase: "event-week" },
    ],
    timeline: [
      { label: "Planning kickoff", detail: "Confirm the vibe, guest count, and host priorities.", sort_order: 1 },
      { label: "Shopping and prep", detail: "Order supplies, prep food, and organize decor.", sort_order: 2 },
      { label: "Guest follow-up", detail: "Check remaining RSVPs and final attendance count.", sort_order: 3 },
      { label: "Event day", detail: "Set the space, cue music, and follow the host checklist.", sort_order: 4 },
    ],
    rawResponse: {
      provider: "party-swami-structured-fallback",
      generatedAt: new Date().toISOString(),
      summary: `Generated a ${theme.toLowerCase()} plan for ${guestCount} guests.`,
    },
  };
}

export function buildInviteCopy(event: EventSeed, context?: InviteContext) {
  const theme = getTheme(event);
  const title = context?.title?.trim() || event.title;
  const dateText = context?.dateText?.trim() || getEventMoment(event);
  const locationText = context?.locationText?.trim() || event.location || "our celebration space";
  const subtitle = context?.subtitle?.trim() || theme;

  return `Join us for ${title}. We would love to celebrate with you on ${dateText} at ${locationText} for a ${subtitle.toLowerCase()} filled with thoughtful details, great company, and an easy flow from arrival to dessert. Please RSVP so we can finish planning with you in mind.`;
}

export function buildShoppingList(event: EventSeed, context?: ShoppingGenerationContext) {
  const shoppingItems = getShoppingItems(event, context);

  return {
    shoppingItems,
    shoppingCategories: toShoppingCategories(shoppingItems),
  };
}

export function buildSocialCampaign(
  input: SocialCampaignGenerationInput,
  brandProfile: SocialBrandProfileContext,
): GeneratedSocialCampaign {
  const theme = normalizeSocialTheme(input.theme);
  const audience =
    input.audienceHint?.trim() || brandProfile.audience || "Hosts planning stylish, low-stress celebrations.";
  const objective =
    input.objectiveHint?.trim() || `Drive saves, clicks, and planning intent around ${theme}.`;
  const sourceEventType = input.sourceEventType?.trim() || null;
  const contentItems = normalizeGeneratedSocialContentItems([], theme, brandProfile);

  return {
    audience,
    objective,
    priority: "medium",
    sourceEventType,
    notes: `Built from the theme "${theme}" using the current brand voice. Focus on ${brandProfile.focusMetrics.toLowerCase()} and keep the tone ${brandProfile.tone.toLowerCase()}.`,
    contentItems,
    rawResponse: {
      provider: "party-swami-social-fallback",
      generatedAt: new Date().toISOString(),
      summary: `Generated a fallback social campaign for ${theme}.`,
    },
  };
}

export async function generateSocialCampaign(
  input: SocialCampaignGenerationInput,
  brandProfile: SocialBrandProfileContext,
): Promise<GeneratedSocialCampaign> {
  const fallback = buildSocialCampaign(input, brandProfile);
  const theme = normalizeSocialTheme(input.theme);
  const generated = await generateStructuredObject({
    generationType: "social_campaign",
    taskType: "plan",
    systemPrompt:
      "You are Party Swami's internal social media strategist. Build multi-channel campaign drafts that are actionable, brand-consistent, practical for admins to review, and tailored to event-driven content marketing.",
    userPrompt: `Create a social media campaign package for this theme.

Theme: ${theme}
Source event type: ${input.sourceEventType?.trim() || "Not provided"}
Audience hint: ${input.audienceHint?.trim() || "Use the brand profile default"}
Objective hint: ${input.objectiveHint?.trim() || "Use the strongest fit for this theme"}

Brand profile:
- Tone: ${brandProfile.tone}
- Audience: ${brandProfile.audience}
- Signature phrases: ${brandProfile.signaturePhrases}
- CTA style: ${brandProfile.ctaStyle}
- Focus metrics: ${brandProfile.focusMetrics}
- Posting goal per week: ${brandProfile.postingGoalPerWeek}

Requirements:
- Return one campaign package that admins can review immediately.
- Include exactly one content item for each channel: tiktok, pinterest, instagram, email, landing_page.
- Keep each item distinct and matched to the channel's native format.
- Make the copy useful for Party Swami as an event-planning and affiliate-friendly brand.
- The content should convert planning intent, not just entertain.
- Use concrete hooks, captions, CTA ideas, and visual direction.
- Stagger publishOffsetDays across the week, starting at 0.
- Return JSON only.`,
    schema: generatedSocialCampaignSchema,
  }).catch(() => null);

  if (!generated) {
    return {
      ...fallback,
      rawResponse: {
        ...fallback.rawResponse,
        model: getOpenAIModel("plan"),
        promptVersion: getPromptVersion("social_campaign"),
        usage: {
          model: getOpenAIModel("plan"),
          promptVersion: getPromptVersion("social_campaign"),
          inputTokens: 0,
          outputTokens: 0,
          cachedInputTokens: 0,
          estimatedCostUsd: 0,
          latencyMs: 0,
          provider: "party-swami-social-fallback",
          usedFallback: true,
        },
      },
    };
  }

  return {
    audience: generated.data.audience,
    objective: generated.data.objective,
    priority: generated.data.priority,
    sourceEventType: generated.data.sourceEventType,
    notes: generated.data.notes,
    contentItems: normalizeGeneratedSocialContentItems(
      generated.data.contentItems,
      theme,
      brandProfile,
    ),
    rawResponse: {
      provider: generated.usage.provider,
      generatedAt: new Date().toISOString(),
      summary: `Generated a social campaign for ${theme}.`,
      model: generated.usage.model,
      promptVersion: generated.usage.promptVersion,
      usage: generated.usage,
    },
  };
}

export async function generateSocialContentItem(
  input: SocialContentGenerationInput,
  brandProfile: SocialBrandProfileContext,
) {
  const generated = await generateStructuredObject({
    generationType: "social_content_regeneration",
    taskType: "lightweight",
    systemPrompt:
      "You are Party Swami's internal social media copy strategist. Generate one polished channel-native content draft that is practical, clear, review-ready, and aligned to the current brand voice.",
    userPrompt: `Create one social content draft.

Theme: ${normalizeSocialTheme(input.theme)}
Channel: ${input.channel}
Audience: ${input.audience}
Objective: ${input.objective}
Campaign notes: ${input.notes?.trim() || "None provided"}

Brand profile:
- Tone: ${brandProfile.tone}
- Audience: ${brandProfile.audience}
- Signature phrases: ${brandProfile.signaturePhrases}
- CTA style: ${brandProfile.ctaStyle}
- Focus metrics: ${brandProfile.focusMetrics}

Requirements:
- Return exactly one content item for the requested channel only.
- Make the copy distinct and native to the channel.
- Use Party Swami as an event-planning and affiliate-friendly brand.
- Include title, formatDetail, copy, callToAction, hashtags, visualDirection, and publishOffsetDays.
- Return JSON only.`,
    schema: generatedSocialContentItemSchema,
  }).catch(() => null);

  if (!generated) {
    const fallback = normalizeSingleSocialContentItem(null, input, brandProfile);

    return {
      item: fallback,
      rawResponse: {
        provider: "party-swami-social-fallback",
        generatedAt: new Date().toISOString(),
        summary: `Generated fallback ${input.channel} draft for ${normalizeSocialTheme(input.theme)}.`,
        model: getOpenAIModel("lightweight"),
        promptVersion: getPromptVersion("social_content_regeneration"),
        usage: {
          model: getOpenAIModel("lightweight"),
          promptVersion: getPromptVersion("social_content_regeneration"),
          inputTokens: 0,
          outputTokens: 0,
          cachedInputTokens: 0,
          estimatedCostUsd: 0,
          latencyMs: 0,
          provider: "party-swami-social-fallback",
          usedFallback: true,
        },
      },
    };
  }

  return {
    item: normalizeSingleSocialContentItem(generated.data, input, brandProfile),
    rawResponse: {
      provider: generated.usage.provider,
      generatedAt: new Date().toISOString(),
      summary: `Regenerated ${input.channel} draft for ${normalizeSocialTheme(input.theme)}.`,
      model: generated.usage.model,
      promptVersion: generated.usage.promptVersion,
      usage: generated.usage,
    },
  };
}

export async function revisePartyPlan({
  event,
  currentPlan,
  changeType,
  instructions,
}: {
  event: EventSeed;
  currentPlan: GeneratedPartyPlan;
  changeType: string;
  instructions: string;
}): Promise<GeneratedPartyPlan> {
  const fallback = buildPartyPlan(event);
  const generated = await generateStructuredObject({
    generationType: "plan_revision",
    taskType: "plan",
    systemPrompt:
      "You revise structured party plans for hosts. Keep revisions practical, preserve good existing details, and return clean JSON only.",
    userPrompt: `Revise this party plan.\n\nEvent brief:\n${eventBrief(event)}\n\nChange type: ${changeType}\nInstructions: ${instructions}\n\nCurrent plan JSON:\n${JSON.stringify({
      theme: currentPlan.theme,
      inviteCopy: currentPlan.inviteCopy,
      menu: currentPlan.menu,
      shoppingCategories: currentPlan.shoppingCategories,
      shoppingItems: currentPlan.shoppingItems,
      tasks: currentPlan.tasks,
      timeline: currentPlan.timeline,
    })}\n\nRequirements:
- Keep the output aligned to the updated request.
- Return a complete plan, not a partial diff.
- Preserve useful details unless the instruction requires changing them.
- Return only JSON.`,
    schema: generatedPartyPlanSchema,
  }).catch(() => null);

  if (!generated) {
    return {
      ...fallback,
      rawResponse: {
        ...fallback.rawResponse,
        model: getOpenAIModel("plan"),
        promptVersion: getPromptVersion("plan_revision"),
        usage: {
          model: getOpenAIModel("plan"),
          promptVersion: getPromptVersion("plan_revision"),
          inputTokens: 0,
          outputTokens: 0,
          cachedInputTokens: 0,
          estimatedCostUsd: 0,
          latencyMs: 0,
          provider: "party-swami-structured-fallback",
          usedFallback: true,
        },
      },
    };
  }

  return {
    ...generated.data,
    shoppingItems: generated.data.shoppingItems.map((item) => normalizeAmazonRecommendation(item)),
    rawResponse: {
      provider: generated.usage.provider,
      generatedAt: new Date().toISOString(),
      summary: `Revised plan using change type "${changeType}".`,
      model: generated.usage.model,
      promptVersion: generated.usage.promptVersion,
      usage: generated.usage,
    },
  };
}

export async function generatePartyPlan(event: EventSeed): Promise<GeneratedPartyPlan> {
  const fallback = buildPartyPlan(event);
  const generated = await generateStructuredObject({
    generationType: "party_plan",
    taskType: "plan",
    systemPrompt:
      "You are Party Swami, an event planning assistant. Create practical host-ready party plans that are realistic, concise, and easy to execute.",
    userPrompt: `Create a complete event plan for this brief.\n${eventBrief(event)}\n\nRequirements:
- Keep the plan aligned to the event type, budget, and guest count.
- Return 3 to 5 menu items.
- Return 4 to 6 shopping items with realistic quantities.
- Return 4 tasks.
- Return 4 timeline items with sort_order starting at 1.
- Return item names that look like real Amazon-searchable product ideas, not generic placeholders.
- Include recommendation_reason explaining why the item fits this specific event.
- Include search_query with the exact Amazon search phrase a host should use.
- Use null for image_url if you do not know an exact image.
- Use an Amazon search URL for external_url when possible.`,
    schema: generatedPartyPlanSchema,
  }).catch(() => null);

  if (!generated) {
    return {
      ...fallback,
      rawResponse: {
        ...fallback.rawResponse,
        model: getOpenAIModel("plan"),
        promptVersion: getPromptVersion("party_plan"),
        usage: {
          model: getOpenAIModel("plan"),
          promptVersion: getPromptVersion("party_plan"),
          inputTokens: 0,
          outputTokens: 0,
          cachedInputTokens: 0,
          estimatedCostUsd: 0,
          latencyMs: 0,
          provider: "party-swami-structured-fallback",
          usedFallback: true,
        },
      } as GeneratedPartyPlan["rawResponse"],
    };
  }

  return {
    ...generated.data,
    shoppingItems: generated.data.shoppingItems.map((item) => normalizeAmazonRecommendation(item)),
    rawResponse: {
      provider: generated.usage.provider,
      generatedAt: new Date().toISOString(),
      summary: "Generated using the OpenAI Responses API.",
      model: generated.usage.model,
      promptVersion: generated.usage.promptVersion,
      usage: generated.usage,
    },
  };
}

export async function generateInviteCopy(event: EventSeed, context?: InviteContext) {
  const fallback = buildInviteCopy(event, context);
  const title = context?.title?.trim() || event.title;
  const dateText = context?.dateText?.trim() || getEventMoment(event);
  const locationText = context?.locationText?.trim() || event.location || "TBD";
  const subtitle = context?.subtitle?.trim() || getTheme(event);
  const currentMessage = context?.currentMessage?.trim();
  const generated = await generateStructuredObject({
    generationType: "invitation_text",
    taskType: "lightweight",
    systemPrompt:
      "You write polished invitation copy for event hosts. Keep the tone warm, specific, guest-facing, and ready to send. The copy should sound like a finished invitation message, not planning notes.",
    userPrompt: `Write invitation copy for this event brief.\n${eventBrief(event)}\n\nCurrent invitation field values:
- Card title: ${title}
- Card subtitle/vibe: ${subtitle}
- Date and time field: ${dateText}
- Location field: ${locationText}
${currentMessage ? `- Current guest message: ${currentMessage}` : ""}
\nRequirements:
- Keep it to one polished paragraph of 2 to 4 sentences.
- Naturally mention the event title, date or timing, and location when available.
- Make it feel welcoming and specific to the occasion, not generic.
- Include a light RSVP call to action.
- Use the provided date/time and location field values directly when they are available.
- Return JSON with an inviteCopy field only.`,
    schema: generatedInviteCopySchema,
  }).catch(() => null);

  if (!generated) {
    return {
      inviteCopy: fallback,
      rawResponse: {
        provider: "party-swami-structured-fallback",
        generatedAt: new Date().toISOString(),
        summary: "Generated invite copy using the local fallback planner.",
        model: getOpenAIModel("lightweight"),
        promptVersion: getPromptVersion("invitation_text"),
        usage: {
          model: getOpenAIModel("lightweight"),
          promptVersion: getPromptVersion("invitation_text"),
          inputTokens: 0,
          outputTokens: 0,
          cachedInputTokens: 0,
          estimatedCostUsd: 0,
          latencyMs: 0,
          provider: "party-swami-structured-fallback",
          usedFallback: true,
        },
      },
    };
  }

  return {
    inviteCopy: generated.data.inviteCopy,
    rawResponse: {
      provider: generated.usage.provider,
      generatedAt: new Date().toISOString(),
      summary: "Generated using the OpenAI Responses API.",
      model: generated.usage.model,
      promptVersion: generated.usage.promptVersion,
      usage: generated.usage,
    },
  };
}

export async function generateShoppingList(event: EventSeed, context?: ShoppingGenerationContext) {
  const fallback = buildShoppingList(event, context);
  const contextLines = [
    context?.planTheme ? `Saved plan theme: ${context.planTheme}` : null,
    context?.menu?.length ? `Saved menu ideas: ${context.menu.join(", ")}` : null,
    context?.shoppingCategories?.length
      ? `Saved shopping category hints: ${context.shoppingCategories
          .map((category) => `${category.category} (${category.items.map((item) => `${item.name} x${item.quantity}`).join(", ")})`)
          .join("; ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
  const generated = await generateStructuredObject({
    generationType: "shopping_list_transform",
    taskType: "lightweight",
    systemPrompt:
      "You build concise shopping lists for event hosts. Focus on realistic, high-signal items only. Be specific, theme-aware, quantity-aware, and practical. Prefer recommendations that look like products someone would actually buy on Amazon, not generic planning notes.",
    userPrompt: `Create a shopping list for this event brief.\n${eventBrief(event)}${contextLines ? `\n\nSaved planning context:\n${contextLines}` : ""}\n\nRequirements:
- Return 6 to 8 useful items.
- Use categories like Decor, Tableware, Beverages, Hosting, Activities, Favors, Upgrades, or Food.
- Quantities must be whole numbers.
- Return item names that feel like specific Amazon-searchable products.
- Include recommendation_reason explaining why each item was chosen for this event.
- Include search_query with the Amazon search phrase to use.
- Use the saved plan context when it improves specificity.
- Vary the recommendation mix so the list does not over-index on one category.
- Use guest count and budget to influence bundle size and upgrade count.
- Avoid placeholders like "party supplies" or "decor pack" unless the rest of the name is specific.
- Use null for image_url if you do not know an exact image.
- Set external_url to an Amazon search URL when possible.`,
    schema: generatedShoppingListSchema,
  }).catch(() => null);

  if (!generated) {
    return {
      ...fallback,
      rawResponse: {
        provider: "party-swami-structured-fallback",
        generatedAt: new Date().toISOString(),
        summary: "Generated shopping list using the local fallback planner.",
        model: getOpenAIModel("lightweight"),
        promptVersion: getPromptVersion("shopping_list_transform"),
        usage: {
          model: getOpenAIModel("lightweight"),
          promptVersion: getPromptVersion("shopping_list_transform"),
          inputTokens: 0,
          outputTokens: 0,
          cachedInputTokens: 0,
          estimatedCostUsd: 0,
          latencyMs: 0,
          provider: "party-swami-structured-fallback",
          usedFallback: true,
        },
      },
    };
  }

  return {
    ...generated.data,
    shoppingItems: generated.data.shoppingItems.map((item) => normalizeAmazonRecommendation(item)),
    rawResponse: {
      provider: generated.usage.provider,
      generatedAt: new Date().toISOString(),
      summary: "Generated using the OpenAI Responses API.",
      model: generated.usage.model,
      promptVersion: generated.usage.promptVersion,
      usage: generated.usage,
    },
  };
}

function buildReplacementFallback(
  event: EventSeed,
  currentItem: {
    category: string;
    name: string;
    quantity: number;
  },
  context?: ShoppingReplacementContext,
) {
  const blockedNames = [currentItem.name, ...(context?.existingCategoryNames ?? [])];
  const replacementPool = buildReplacementPool(event, currentItem, context).map((item) =>
    normalizeAmazonRecommendation(item),
  );

  const poolMatch = replacementPool.find(
    (item) => !isNameTooSimilar(item.name, blockedNames),
  );

  if (poolMatch) {
    return poolMatch;
  }

  const blockedNameSet = new Set(blockedNames.map((value) => value.trim().toLowerCase()));

  const fallbackMatch = getShoppingItems(event, context).find(
    (item) =>
      item.category.toLowerCase() === currentItem.category.toLowerCase() &&
      !blockedNameSet.has(item.name.trim().toLowerCase()) &&
      !isNameTooSimilar(item.name, blockedNames),
  );

  if (fallbackMatch) {
    return fallbackMatch;
  }

  return replacementPool[0];
}

export async function generateReplacementShoppingItem(
  event: EventSeed,
  currentItem: {
    category: string;
    name: string;
    quantity: number;
  },
  context?: ShoppingReplacementContext,
) {
  const fallback = buildReplacementFallback(event, currentItem, context);
  const blockedNames = [currentItem.name, ...(context?.existingCategoryNames ?? [])];
  const alternateAngles = buildReplacementAngles(currentItem.category);
  const feedbackInstruction =
    context?.feedback === "too_expensive"
      ? "Host feedback: the current pick feels too expensive. Favor a lower-cost option while keeping the category useful."
      : context?.feedback === "not_my_style"
        ? "Host feedback: the current pick is not their style. Favor a visually or stylistically different direction in the same category."
        : null;
  const contextLines = [
    context?.planTheme ? `Saved plan theme: ${context.planTheme}` : null,
    context?.menu?.length ? `Saved menu ideas: ${context.menu.join(", ")}` : null,
    context?.shoppingCategories?.length
      ? `Saved shopping category hints: ${context.shoppingCategories
          .map((category) => `${category.category} (${category.items.map((item) => `${item.name} x${item.quantity}`).join(", ")})`)
          .join("; ")}`
      : null,
    context?.existingCategoryNames?.length
      ? `Existing picks already in this category: ${context.existingCategoryNames.join(", ")}`
      : null,
    feedbackInstruction,
    `Avoid names that feel too close to: ${blockedNames.join(", ")}`,
    `Try one of these alternate angles for this category: ${alternateAngles.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");

  const generated = await generateStructuredObject({
    generationType: "shopping_list_transform",
    taskType: "lightweight",
    systemPrompt:
      "You replace one shopping recommendation for an event host. Return one stronger alternative in the same category. Avoid duplicates and keep the new pick realistic, Amazon-searchable, and specific to the event.",
    userPrompt: `Replace one shopping recommendation for this event.\n${eventBrief(event)}${
      contextLines ? `\n\nSaved planning context:\n${contextLines}` : ""
    }\n\nCurrent item to replace:
- Category: ${currentItem.category}
- Name: ${currentItem.name}
- Quantity: ${currentItem.quantity}

Requirements:
- Return exactly one replacement item in the same category.
- The replacement must have a different name from the current item.
- Do not repeat any existing picks already listed in this category.
- Do not reuse the same core nouns from the current item unless absolutely necessary.
- Push the recommendation toward a different angle within the category instead of making a tiny variation.
- If the host says the pick is too expensive, lower the price meaningfully when possible.
- If the host says the pick is not their style, make the new pick feel visually or functionally different.
- Keep the quantity realistic for the guest count and event type.
- Include recommendation_reason explaining why this alternate is a better fit.
- Include search_query with the Amazon search phrase to use.
- Use null for image_url if you do not know an exact image.
- Set external_url to an Amazon search URL when possible.`,
    schema: generatedShoppingItemSchema,
  }).catch(() => null);

  if (!generated) {
    return {
      item: fallback,
      rawResponse: {
        provider: "party-swami-structured-fallback",
        generatedAt: new Date().toISOString(),
        summary: `Replaced shopping item "${currentItem.name}" using the local fallback planner.`,
        model: getOpenAIModel("lightweight"),
        promptVersion: getPromptVersion("shopping_list_transform"),
        usage: {
          model: getOpenAIModel("lightweight"),
          promptVersion: getPromptVersion("shopping_list_transform"),
          inputTokens: 0,
          outputTokens: 0,
          cachedInputTokens: 0,
          estimatedCostUsd: 0,
          latencyMs: 0,
          provider: "party-swami-structured-fallback",
          usedFallback: true,
        },
      },
    };
  }

  const normalizedItem = normalizeAmazonRecommendation({
    ...generated.data,
    category: currentItem.category,
  });

  if (isNameTooSimilar(normalizedItem.name, blockedNames)) {
    return {
      item: fallback,
      rawResponse: {
        provider: "party-swami-structured-fallback",
        generatedAt: new Date().toISOString(),
        summary: `Used fallback because the generated replacement was too similar to an existing pick for "${currentItem.name}".`,
        model: getOpenAIModel("lightweight"),
        promptVersion: getPromptVersion("shopping_list_transform"),
        usage: {
          model: getOpenAIModel("lightweight"),
          promptVersion: getPromptVersion("shopping_list_transform"),
          inputTokens: 0,
          outputTokens: 0,
          cachedInputTokens: 0,
          estimatedCostUsd: 0,
          latencyMs: 0,
          provider: "party-swami-structured-fallback",
          usedFallback: true,
        },
      },
    };
  }

  return {
    item: normalizedItem,
    rawResponse: {
      provider: generated.usage.provider,
      generatedAt: new Date().toISOString(),
      summary: `Replaced shopping item "${currentItem.name}" with a fresh recommendation.`,
      model: generated.usage.model,
      promptVersion: generated.usage.promptVersion,
      usage: generated.usage,
    },
  };
}

export { getOpenAIModel, getPromptVersion };
export type {
  EventSeed,
  GeneratedShoppingItem,
  SocialCampaignGenerationInput,
  SocialContentGenerationInput,
};
