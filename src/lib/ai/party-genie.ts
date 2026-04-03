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

type AiTaskType = "plan" | "lightweight" | "premium";
const PROMPT_VERSIONS: Record<AiGenerationType, string> = {
  party_plan: "party-plan-v2",
  plan_revision: "plan-revision-v1",
  invitation_text: "invitation-text-v2",
  shopping_list_transform: "shopping-list-v2",
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

function buildAmazonSearchUrl(query: string) {
  return `https://www.amazon.com/s?k=${encodeURIComponent(query.trim())}`;
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

function getShoppingItems(event: EventSeed): GeneratedShoppingItem[] {
  const guestCount = getGuestCount(event);
  const type = event.event_type.toLowerCase();

  const baseItems: GeneratedShoppingItem[] = [
    normalizeAmazonRecommendation({
      category: "Decor",
      name: "Theme-forward table accent set",
      quantity: Math.max(2, Math.ceil(guestCount / 6)),
      estimated_price: 18,
      recommendation_reason: `Adds a quick visual lift and helps the ${getTheme(event).toLowerCase()} setup feel intentional right away.`,
      search_query: `${getTheme(event)} party table decor set`,
      image_url: null,
    }),
    normalizeAmazonRecommendation({
      category: "Hosting",
      name: "Guest-ready napkin and tabletop bundle",
      quantity: Math.max(1, Math.ceil(guestCount / 12)),
      estimated_price: 16,
      recommendation_reason: guestCount
        ? `Sized to support about ${guestCount} guests without making you piece together basics one by one.`
        : "Covers the practical hosting basics without making you hunt through multiple listings.",
      search_query: `${event.event_type} party napkins tableware set for ${guestCount} guests`,
      image_url: null,
    }),
    normalizeAmazonRecommendation({
      category: "Beverages",
      name: "Drink station extras and mixers pack",
      quantity: Math.max(2, Math.ceil(guestCount / 8)),
      estimated_price: 14,
      recommendation_reason: "Supports an easy self-serve drink setup so the host is not stuck refilling the station all event.",
      search_query: `${event.event_type} party drink dispenser accessories mixers`,
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
        category: "Food",
        name: "Celebration cake topper and candle set",
        quantity: 1,
        estimated_price: 14,
        recommendation_reason: "Adds a birthday-specific finish and works well even if the cake itself comes from somewhere else.",
        search_query: `${getTheme(event)} birthday cake topper candles`,
        image_url: null,
      }),
      normalizeAmazonRecommendation({
        category: "Decor",
        name: "Photo backdrop or balloon statement kit",
        quantity: 1,
        estimated_price: 28,
        recommendation_reason: "Creates the visual focal point most birthday hosts want for photos and arrival impact.",
        search_query: `${getTheme(event)} birthday balloon arch backdrop kit`,
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

  return baseItems;
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
      provider: "party-genie-structured-fallback",
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

export function buildShoppingList(event: EventSeed) {
  const shoppingItems = getShoppingItems(event);

  return {
    shoppingItems,
    shoppingCategories: toShoppingCategories(shoppingItems),
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
          provider: "party-genie-structured-fallback",
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
      "You are AI Party Genie, an event planning assistant. Create practical host-ready party plans that are realistic, concise, and easy to execute.",
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
          provider: "party-genie-structured-fallback",
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
        provider: "party-genie-structured-fallback",
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
          provider: "party-genie-structured-fallback",
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

export async function generateShoppingList(event: EventSeed) {
  const fallback = buildShoppingList(event);
  const generated = await generateStructuredObject({
    generationType: "shopping_list_transform",
    taskType: "lightweight",
    systemPrompt:
      "You build concise shopping lists for event hosts. Focus on realistic, high-signal items only.",
    userPrompt: `Create a shopping list for this event brief.\n${eventBrief(event)}\n\nRequirements:
- Return 4 to 6 useful items.
- Use broad categories like Decor, Food, Beverages, Hosting, Tableware, Favors, Upgrades.
- Quantities must be whole numbers.
- Return item names that feel like specific Amazon-searchable products.
- Include recommendation_reason explaining why each item was chosen for this event.
- Include search_query with the Amazon search phrase to use.
- Use null for image_url if you do not know an exact image.
- Set external_url to an Amazon search URL when possible.`,
    schema: generatedShoppingListSchema,
  }).catch(() => null);

  if (!generated) {
    return {
      ...fallback,
      rawResponse: {
        provider: "party-genie-structured-fallback",
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
          provider: "party-genie-structured-fallback",
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

export { getOpenAIModel, getPromptVersion };
export type { EventSeed, GeneratedShoppingItem };
