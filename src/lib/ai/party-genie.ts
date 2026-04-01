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
  };
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

function getBudgetLabel(event: EventSeed) {
  return event.budget == null ? "Flexible budget" : `$${event.budget}`;
}

function getGuestCount(event: EventSeed) {
  return event.guest_target ?? 12;
}

function getTheme(event: EventSeed) {
  return event.theme?.trim() || `${event.event_type} celebration`;
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
    {
      category: "Decor",
      name: "Candles or table accents",
      quantity: Math.max(2, Math.ceil(guestCount / 6)),
      estimated_price: 12,
      external_url: null,
    },
    {
      category: "Hosting",
      name: "Disposable napkins or linens",
      quantity: Math.max(1, Math.ceil(guestCount / 12)),
      estimated_price: 10,
      external_url: null,
    },
    {
      category: "Beverages",
      name: "Sparkling water and mixers",
      quantity: Math.max(2, Math.ceil(guestCount / 8)),
      estimated_price: 8,
      external_url: null,
    },
  ];

  if (type.includes("dinner")) {
    baseItems.push(
      {
        category: "Food",
        name: "Main course ingredients",
        quantity: 1,
        estimated_price: 45,
        external_url: null,
      },
      {
        category: "Food",
        name: "Dessert ingredients",
        quantity: 1,
        estimated_price: 18,
        external_url: null,
      },
    );
  } else if (type.includes("birthday")) {
    baseItems.push(
      {
        category: "Food",
        name: "Birthday cake or cupcakes",
        quantity: 1,
        estimated_price: 30,
        external_url: null,
      },
      {
        category: "Decor",
        name: "Balloons or backdrop kit",
        quantity: 1,
        estimated_price: 25,
        external_url: null,
      },
    );
  } else {
    baseItems.push({
      category: "Food",
      name: "Shareable appetizers",
      quantity: Math.max(2, Math.ceil(guestCount / 8)),
      estimated_price: 16,
      external_url: null,
    });
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
  taskType,
  systemPrompt,
  userPrompt,
  schema,
}: {
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

  const parsed = schema.parse(extractJsonObject(response.output_text));

  return {
    data: parsed,
    rawResponse: {
      provider: "openai-responses",
      generatedAt: new Date().toISOString(),
      summary: "Generated using the OpenAI Responses API.",
      model,
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

export function buildInviteCopy(event: EventSeed) {
  const theme = getTheme(event);
  const eventMoment = getEventMoment(event);

  return `Join us for ${event.title} on ${eventMoment}. We're planning a ${theme.toLowerCase()} with a warm welcome, great food, and a relaxed flow from arrival to dessert. Please RSVP so we can finalize the setup.`;
}

export function buildShoppingList(event: EventSeed) {
  const shoppingItems = getShoppingItems(event);

  return {
    shoppingItems,
    shoppingCategories: toShoppingCategories(shoppingItems),
  };
}

export async function generatePartyPlan(event: EventSeed): Promise<GeneratedPartyPlan> {
  const fallback = buildPartyPlan(event);
  const generated = await generateStructuredObject({
    taskType: "plan",
    systemPrompt:
      "You are PartyGenie, an event planning assistant. Create practical host-ready party plans that are realistic, concise, and easy to execute.",
    userPrompt: `Create a complete event plan for this brief.\n${eventBrief(event)}\n\nRequirements:
- Keep the plan aligned to the event type, budget, and guest count.
- Return 3 to 5 menu items.
- Return 4 to 6 shopping items with realistic quantities.
- Return 4 tasks.
- Return 4 timeline items with sort_order starting at 1.
- Use null for external_url unless a clear retailer link is necessary.`,
    schema: generatedPartyPlanSchema,
  }).catch(() => null);

  if (!generated) {
    return fallback;
  }

  return {
    ...generated.data,
    rawResponse: generated.rawResponse,
  };
}

export async function generateInviteCopy(event: EventSeed) {
  const fallback = buildInviteCopy(event);
  const generated = await generateStructuredObject({
    taskType: "lightweight",
    systemPrompt:
      "You write polished invitation copy for event hosts. Keep the tone warm, specific, and ready to send.",
    userPrompt: `Write invitation copy for this event brief.\n${eventBrief(event)}\n\nRequirements:
- Keep it to one short paragraph.
- Mention the event title, timing, tone, and RSVP request.
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
      },
    };
  }

  return {
    inviteCopy: generated.data.inviteCopy,
    rawResponse: generated.rawResponse,
  };
}

export async function generateShoppingList(event: EventSeed) {
  const fallback = buildShoppingList(event);
  const generated = await generateStructuredObject({
    taskType: "lightweight",
    systemPrompt:
      "You build concise shopping lists for event hosts. Focus on realistic, high-signal items only.",
    userPrompt: `Create a shopping list for this event brief.\n${eventBrief(event)}\n\nRequirements:
- Return 4 to 6 useful items.
- Use broad categories like Decor, Food, Beverages, Hosting.
- Quantities must be whole numbers.
- Use null for external_url unless absolutely necessary.`,
    schema: generatedShoppingListSchema,
  }).catch(() => null);

  if (!generated) {
    return {
      ...fallback,
      rawResponse: {
        provider: "party-genie-structured-fallback",
        generatedAt: new Date().toISOString(),
        summary: "Generated shopping list using the local fallback planner.",
      },
    };
  }

  return {
    ...generated.data,
    rawResponse: generated.rawResponse,
  };
}

export type { EventSeed, GeneratedShoppingItem };
