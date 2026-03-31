"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const blankToNullNumber = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  return value;
}, z.number().min(0).nullable());

const eventSchema = z.object({
  title: z.string().trim().min(2, "Title is required."),
  eventType: z.string().trim().min(2, "Event type is required."),
  eventDate: z.string().optional(),
  eventTime: z.string().optional(),
  location: z.string().trim().optional(),
  guestTarget: blankToNullNumber.transform((value) => (value == null ? null : Math.trunc(value))).optional(),
  budget: blankToNullNumber.optional(),
  theme: z.string().trim().optional(),
});

const guestSchema = z.object({
  eventId: z.string().uuid(),
  name: z.string().trim().min(2),
  email: z.email().optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  plusOneCount: z.coerce.number().int().min(0).default(0),
});

const inviteSchema = z.object({
  eventId: z.string().uuid(),
  inviteId: z.string().uuid(),
  inviteCopy: z.string().trim().min(10),
  isPublic: z.enum(["true", "false"]).default("false"),
});

const shoppingItemSchema = z.object({
  eventId: z.string().uuid(),
  shoppingListId: z.string().uuid(),
  category: z.string().trim().min(2),
  name: z.string().trim().min(2),
  quantity: z.coerce.number().int().min(1),
  estimatedPrice: blankToNullNumber.optional(),
  externalUrl: z.url().optional().or(z.literal("")),
});

const shoppingSettingsSchema = z.object({
  eventId: z.string().uuid(),
  shoppingListId: z.string().uuid(),
  retailer: z.enum(["amazon", "walmart", "mixed"]),
});

const taskSchema = z.object({
  eventId: z.string().uuid(),
  title: z.string().trim().min(2),
  dueLabel: z.string().trim().optional(),
  phase: z.string().trim().optional(),
});

const toggleTaskSchema = z.object({
  eventId: z.string().uuid(),
  taskId: z.string().uuid(),
  nextStatus: z.enum(["pending", "completed"]),
});

const profileSchema = z.object({
  eventId: z.string().uuid(),
  fullName: z.string().trim().min(2),
});

function parseDateTime(date?: string, time?: string) {
  if (!date) return null;
  if (!time) return new Date(`${date}T12:00:00`).toISOString();
  return new Date(`${date}T${time}:00`).toISOString();
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

export async function createEventAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = eventSchema.safeParse({
    title: formData.get("title"),
    eventType: formData.get("eventType"),
    eventDate: formData.get("eventDate") || undefined,
    eventTime: formData.get("eventTime") || undefined,
    location: formData.get("location") || undefined,
    guestTarget: formData.get("guestTarget"),
    budget: formData.get("budget"),
    theme: formData.get("theme") || undefined,
  });

  if (!parsed.success) {
    redirect(`/events/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid event details.")}`);
  }

  const eventDate = parseDateTime(parsed.data.eventDate, parsed.data.eventTime);
  const theme = parsed.data.theme?.trim() || `${parsed.data.eventType} celebration`;
  const inviteCopy = `You're invited to ${parsed.data.title}. Join us for a ${theme.toLowerCase()} with food, fun, and great company.`;

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      owner_id: user.id,
      title: parsed.data.title,
      event_type: parsed.data.eventType,
      event_date: eventDate,
      location: parsed.data.location?.trim() || null,
      guest_target: parsed.data.guestTarget ?? null,
      budget: parsed.data.budget ?? null,
      theme: parsed.data.theme?.trim() || null,
      status: "planning",
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !event) {
    redirect(`/events/new?error=${encodeURIComponent(error?.message ?? "Unable to create event.")}`);
  }

  const planTasks = [
    { title: "Finalize invite wording", due_label: "This week", phase: "pre-event" },
    { title: "Build shopping list", due_label: "This week", phase: "pre-event" },
    { title: "Confirm RSVPs", due_label: "Event week", phase: "event-week" },
  ];

  const timeline = [
    { label: "Finalize details", detail: "Lock the guest list and invite copy.", sort_order: 1 },
    { label: "Shopping day", detail: "Order non-perishables and decor.", sort_order: 2 },
    { label: "Event day", detail: "Follow setup and hosting checklist.", sort_order: 3 },
  ];

  await Promise.all([
    supabase.from("invites").insert({
      event_id: event.id,
      invite_copy: inviteCopy,
      is_public: false,
    }),
    supabase.from("shopping_lists").insert({
      event_id: event.id,
      retailer: "mixed",
      estimated_total: 0,
    }),
    supabase.from("party_plans").insert({
      event_id: event.id,
      theme,
      invite_copy: inviteCopy,
      menu: ["Signature drink", "Main spread", "Dessert table"],
      shopping_categories: [
        { category: "Decor", items: [{ name: "Candles", quantity: 3 }] },
        { category: "Food", items: [{ name: "Party bites", quantity: 12 }] },
      ],
      tasks: planTasks,
      timeline: timeline.map(({ label, detail }) => ({ label, detail })),
      generated_at: new Date().toISOString(),
    }),
    supabase.from("tasks").insert(planTasks.map((task) => ({ event_id: event.id, ...task }))),
    supabase.from("timeline_items").insert(timeline.map((item) => ({ event_id: event.id, ...item }))),
  ]);

  revalidatePath("/dashboard");
  redirect(`/events/${event.id}`);
}

export async function saveInviteAction(formData: FormData) {
  const { supabase } = await requireUser();
  const parsed = inviteSchema.safeParse({
    eventId: formData.get("eventId"),
    inviteId: formData.get("inviteId"),
    inviteCopy: formData.get("inviteCopy"),
    isPublic: formData.get("isPublic") ?? "false",
  });

  if (!parsed.success) return;

  await Promise.all([
    supabase
      .from("invites")
      .update({
        invite_copy: parsed.data.inviteCopy,
        is_public: parsed.data.isPublic === "true",
      })
      .eq("id", parsed.data.inviteId),
    supabase
      .from("party_plans")
      .update({
        invite_copy: parsed.data.inviteCopy,
      })
      .eq("event_id", parsed.data.eventId),
  ]);

  revalidatePath(`/events/${parsed.data.eventId}`);
  revalidatePath(`/events/${parsed.data.eventId}/invite`);
}

export async function markInviteSentAction(formData: FormData) {
  const { supabase } = await requireUser();
  const eventId = z.string().uuid().parse(formData.get("eventId"));
  const inviteId = z.string().uuid().parse(formData.get("inviteId"));

  await supabase
    .from("invites")
    .update({ sent_at: new Date().toISOString() })
    .eq("id", inviteId);

  revalidatePath(`/events/${eventId}/invite`);
}

export async function addGuestAction(formData: FormData) {
  const { supabase } = await requireUser();
  const parsed = guestSchema.safeParse({
    eventId: formData.get("eventId"),
    name: formData.get("name"),
    email: formData.get("email") || "",
    phone: formData.get("phone") || "",
    plusOneCount: formData.get("plusOneCount") || 0,
  });

  if (!parsed.success) return;

  await supabase.from("guests").insert({
    event_id: parsed.data.eventId,
    name: parsed.data.name,
    email: parsed.data.email || null,
    phone: parsed.data.phone?.trim() || null,
    plus_one_count: parsed.data.plusOneCount,
  });

  revalidatePath(`/events/${parsed.data.eventId}`);
  revalidatePath(`/events/${parsed.data.eventId}/guests`);
  revalidatePath("/dashboard");
}

export async function addShoppingItemAction(formData: FormData) {
  const { supabase } = await requireUser();
  const parsed = shoppingItemSchema.safeParse({
    eventId: formData.get("eventId"),
    shoppingListId: formData.get("shoppingListId"),
    category: formData.get("category"),
    name: formData.get("name"),
    quantity: formData.get("quantity"),
    estimatedPrice: formData.get("estimatedPrice"),
    externalUrl: formData.get("externalUrl") || "",
  });

  if (!parsed.success) return;

  await supabase.from("shopping_items").insert({
    shopping_list_id: parsed.data.shoppingListId,
    category: parsed.data.category,
    name: parsed.data.name,
    quantity: parsed.data.quantity,
    estimated_price: parsed.data.estimatedPrice ?? null,
    external_url: parsed.data.externalUrl || null,
  });

  const { data: items } = await supabase
    .from("shopping_items")
    .select("estimated_price, quantity")
    .eq("shopping_list_id", parsed.data.shoppingListId)
    .returns<Array<{ estimated_price: number | null; quantity: number }>>();

  const estimatedTotal = (items ?? []).reduce(
    (sum, item) => sum + (item.estimated_price ?? 0) * item.quantity,
    0,
  );

  await supabase
    .from("shopping_lists")
    .update({ estimated_total: estimatedTotal })
    .eq("id", parsed.data.shoppingListId);

  revalidatePath(`/events/${parsed.data.eventId}`);
  revalidatePath(`/events/${parsed.data.eventId}/shopping`);
  revalidatePath("/dashboard");
}

export async function updateShoppingSettingsAction(formData: FormData) {
  const { supabase } = await requireUser();
  const parsed = shoppingSettingsSchema.safeParse({
    eventId: formData.get("eventId"),
    shoppingListId: formData.get("shoppingListId"),
    retailer: formData.get("retailer"),
  });

  if (!parsed.success) return;

  await supabase
    .from("shopping_lists")
    .update({ retailer: parsed.data.retailer })
    .eq("id", parsed.data.shoppingListId);

  revalidatePath(`/events/${parsed.data.eventId}/shopping`);
}

export async function addTaskAction(formData: FormData) {
  const { supabase } = await requireUser();
  const parsed = taskSchema.safeParse({
    eventId: formData.get("eventId"),
    title: formData.get("title"),
    dueLabel: formData.get("dueLabel") || "",
    phase: formData.get("phase") || "",
  });

  if (!parsed.success) return;

  await supabase.from("tasks").insert({
    event_id: parsed.data.eventId,
    title: parsed.data.title,
    due_label: parsed.data.dueLabel || null,
    phase: parsed.data.phase || null,
  });

  revalidatePath(`/events/${parsed.data.eventId}`);
  revalidatePath(`/events/${parsed.data.eventId}/timeline`);
  revalidatePath("/dashboard");
}

export async function toggleTaskStatusAction(formData: FormData) {
  const { supabase } = await requireUser();
  const parsed = toggleTaskSchema.safeParse({
    eventId: formData.get("eventId"),
    taskId: formData.get("taskId"),
    nextStatus: formData.get("nextStatus"),
  });

  if (!parsed.success) return;

  await supabase
    .from("tasks")
    .update({
      status: parsed.data.nextStatus,
      completed_at: parsed.data.nextStatus === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.taskId);

  revalidatePath(`/events/${parsed.data.eventId}`);
  revalidatePath(`/events/${parsed.data.eventId}/timeline`);
  revalidatePath("/dashboard");
}

export async function updateProfileAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = profileSchema.safeParse({
    eventId: formData.get("eventId"),
    fullName: formData.get("fullName"),
  });

  if (!parsed.success) return;

  await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName })
    .eq("id", user.id);

  revalidatePath(`/events/${parsed.data.eventId}/settings`);
}
