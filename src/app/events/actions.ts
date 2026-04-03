"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { enforceAiLimits } from "@/lib/ai/limits";
import { generatePlanForEvent, restorePlanVersionForEvent } from "@/lib/ai/workflows";
import { inviteDesignSchema } from "@/lib/invite-design";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAuditLog, trackAnalyticsEvent } from "@/lib/telemetry";

const blankToNullNumber = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
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
  designJson: z.string().optional(),
});

const guestSchema = z.object({
  eventId: z.string().uuid(),
  name: z.string().trim().min(2),
  email: z.email().optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  plusOneCount: z.coerce.number().int().min(0).default(0),
});

const bulkGuestRowSchema = z.object({
  name: z.string().trim().min(2),
  email: z.email().optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  plusOneCount: z.coerce.number().int().min(0).default(0),
});

const updateGuestSchema = guestSchema.extend({
  guestId: z.string().uuid(),
  status: z.enum(["pending", "confirmed", "declined"]),
});

const deleteGuestSchema = z.object({
  eventId: z.string().uuid(),
  guestId: z.string().uuid(),
});

const deleteEventSchema = z.object({
  eventId: z.string().uuid(),
});

const updateEventStatusSchema = z.object({
  eventId: z.string().uuid(),
  nextStatus: z.enum(["draft", "planning", "ready", "completed"]),
});

const inviteSchema = z.object({
  eventId: z.string().uuid(),
  inviteId: z.string().uuid(),
  inviteCopy: z.string().trim().min(10),
  designJson: z.string().optional(),
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

const updateShoppingItemSchema = shoppingItemSchema.extend({
  itemId: z.string().uuid(),
  status: z.enum(["pending", "ready", "purchased", "removed"]),
});

const deleteShoppingItemSchema = z.object({
  eventId: z.string().uuid(),
  shoppingListId: z.string().uuid(),
  itemId: z.string().uuid(),
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

const updateTaskSchema = taskSchema.extend({
  taskId: z.string().uuid(),
  status: z.enum(["pending", "completed", "overdue"]),
});

const deleteTaskSchema = z.object({
  eventId: z.string().uuid(),
  taskId: z.string().uuid(),
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

const restorePlanVersionSchema = z.object({
  eventId: z.string().uuid(),
  versionId: z.string().uuid(),
});

function parseDateTime(date?: string, time?: string) {
  if (!date) return null;
  if (!time) return new Date(`${date}T12:00:00`).toISOString();
  return new Date(`${date}T${time}:00`).toISOString();
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseGuestImportCsv(csvText: string) {
  const normalizedText = csvText.replace(/^\uFEFF/, "").trim();

  if (!normalizedText) {
    throw new Error("The uploaded CSV is empty.");
  }

  const lines = normalizedText.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    throw new Error("Add at least one guest row below the header.");
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim().toLowerCase());
  const requiredHeaders = ["name", "email", "phone", "plusonecount"];

  if (!requiredHeaders.every((header) => headers.includes(header))) {
    throw new Error("Use the sample CSV template so the column headers match.");
  }

  const rows = lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const record = Object.fromEntries(headers.map((header, headerIndex) => [header, values[headerIndex] ?? ""]));
    const parsedRow = bulkGuestRowSchema.safeParse({
      name: record.name,
      email: record.email || "",
      phone: record.phone || "",
      plusOneCount: record.plusonecount || 0,
    });

    if (!parsedRow.success) {
      throw new Error(`Row ${index + 2} is invalid. Check the name, email, and plus-one fields.`);
    }

    return parsedRow.data;
  });

  if (!rows.length) {
    throw new Error("No guest rows were found in the uploaded CSV.");
  }

  return rows;
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

async function updateShoppingListEstimate(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, shoppingListId: string) {
  const { data: items } = await supabase
    .from("shopping_items")
    .select("estimated_price, quantity")
    .eq("shopping_list_id", shoppingListId)
    .neq("status", "removed")
    .returns<Array<{ estimated_price: number | null; quantity: number }>>();

  const estimatedTotal = (items ?? []).reduce(
    (sum, item) => sum + (item.estimated_price ?? 0) * item.quantity,
    0,
  );

  await supabase
    .from("shopping_lists")
    .update({ estimated_total: estimatedTotal })
    .eq("id", shoppingListId);
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
    designJson: formData.get("designJson")?.toString(),
  });

  if (!parsed.success) {
    redirect(`/events/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid event details.")}`);
  }

  const eventDate = parseDateTime(parsed.data.eventDate, parsed.data.eventTime);
  const theme = parsed.data.theme?.trim() || `${parsed.data.eventType} celebration`;
  let parsedDesign: ReturnType<typeof inviteDesignSchema.safeParse> | null = null;

  if (parsed.data.designJson) {
    try {
      parsedDesign = inviteDesignSchema.safeParse(JSON.parse(parsed.data.designJson));
    } catch {
      parsedDesign = null;
    }
  }
  const designJson = parsedDesign?.success ? parsedDesign.data : null;
  const inviteCopy =
    designJson?.fields.messageText ||
    `You're invited to ${parsed.data.title}. Join us for a ${theme.toLowerCase()} with food, fun, and great company.`;

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
      design_json: designJson,
      invite_copy: inviteCopy,
      is_public: true,
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

  await Promise.all([
    trackAnalyticsEvent(supabase, {
      eventName: "event_created",
      userId: user.id,
      eventId: event.id,
      metadata: {
        event_type: parsed.data.eventType,
        has_theme: Boolean(parsed.data.theme?.trim()),
        guest_target: parsed.data.guestTarget ?? null,
        budget: parsed.data.budget ?? null,
      },
    }),
    createAuditLog(supabase, {
      action: "event_created",
      userId: user.id,
      eventId: event.id,
      metadata: {
        event_type: parsed.data.eventType,
        location: parsed.data.location?.trim() || null,
      },
    }),
  ]);

  try {
    const limit = await enforceAiLimits(supabase, {
      userId: user.id,
      eventId: event.id,
      generationType: "party_plan",
    });

    if (limit.allowed) {
      await generatePlanForEvent(supabase, event.id);
    }
  } catch {
    // Event creation should still succeed even if the first AI generation cannot run.
  }

  revalidatePath("/dashboard");
  redirect(`/events/${event.id}/invite`);
}

export async function saveInviteAction(formData: FormData) {
  const { supabase } = await requireUser();
  const parsed = inviteSchema.safeParse({
    eventId: formData.get("eventId"),
    inviteId: formData.get("inviteId"),
    inviteCopy: formData.get("inviteCopy"),
    designJson: formData.get("designJson")?.toString(),
  });

  if (!parsed.success) return;

  let designJson: unknown = null;

  if (parsed.data.designJson) {
    try {
      designJson = JSON.parse(parsed.data.designJson);
    } catch {
      designJson = null;
    }
  }

  await Promise.all([
    supabase
      .from("invites")
      .update({
        design_json: designJson,
        invite_copy: parsed.data.inviteCopy,
        is_public: true,
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

export async function deleteEventAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = deleteEventSchema.safeParse({
    eventId: formData.get("eventId"),
  });

  if (!parsed.success) return;

  await supabase
    .from("events")
    .delete()
    .eq("id", parsed.data.eventId)
    .eq("owner_id", user.id);

  revalidatePath("/dashboard");
}

export async function updateEventStatusAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = updateEventStatusSchema.safeParse({
    eventId: formData.get("eventId"),
    nextStatus: formData.get("nextStatus"),
  });

  if (!parsed.success) return;

  const completedAt =
    parsed.data.nextStatus === "completed" ? new Date().toISOString() : null;

  await supabase
    .from("events")
    .update({
      status: parsed.data.nextStatus,
      completed_at: completedAt,
    })
    .eq("id", parsed.data.eventId)
    .eq("owner_id", user.id);

  await createAuditLog(supabase, {
    action:
      parsed.data.nextStatus === "completed" ? "event_marked_completed" : "event_reopened",
    userId: user.id,
    eventId: parsed.data.eventId,
    metadata: {
      next_status: parsed.data.nextStatus,
      completed_at: completedAt,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/events/${parsed.data.eventId}`);
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

export async function importGuestsAction(formData: FormData) {
  const { supabase } = await requireUser();
  const eventId = z.string().uuid().parse(formData.get("eventId"));
  const file = formData.get("guestCsv");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Upload a CSV file with your guest list.");
  }

  const csvText = await file.text();
  const guests = parseGuestImportCsv(csvText);

  await supabase.from("guests").insert(
    guests.map((guest) => ({
      event_id: eventId,
      name: guest.name,
      email: guest.email || null,
      phone: guest.phone?.trim() || null,
      plus_one_count: guest.plusOneCount,
    })),
  );

  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/events/${eventId}/guests`);
  revalidatePath(`/events/${eventId}/invite`);
  revalidatePath("/dashboard");
}

export async function updateGuestAction(formData: FormData) {
  const { supabase } = await requireUser();
  const parsed = updateGuestSchema.safeParse({
    eventId: formData.get("eventId"),
    guestId: formData.get("guestId"),
    name: formData.get("name"),
    email: formData.get("email") || "",
    phone: formData.get("phone") || "",
    plusOneCount: formData.get("plusOneCount") || 0,
    status: formData.get("status"),
  });

  if (!parsed.success) return;

  const normalizedPlusOnes =
    parsed.data.status === "confirmed" ? parsed.data.plusOneCount : 0;

  await supabase
    .from("guests")
    .update({
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone?.trim() || null,
      plus_one_count: normalizedPlusOnes,
      status: parsed.data.status,
    })
    .eq("id", parsed.data.guestId);

  revalidatePath(`/events/${parsed.data.eventId}`);
  revalidatePath(`/events/${parsed.data.eventId}/guests`);
  revalidatePath(`/events/${parsed.data.eventId}/invite`);
  revalidatePath("/dashboard");
}

export async function deleteGuestAction(formData: FormData) {
  const { supabase } = await requireUser();
  const parsed = deleteGuestSchema.safeParse({
    eventId: formData.get("eventId"),
    guestId: formData.get("guestId"),
  });

  if (!parsed.success) return;

  await supabase.from("guests").delete().eq("id", parsed.data.guestId);

  revalidatePath(`/events/${parsed.data.eventId}`);
  revalidatePath(`/events/${parsed.data.eventId}/guests`);
  revalidatePath(`/events/${parsed.data.eventId}/invite`);
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

  await updateShoppingListEstimate(supabase, parsed.data.shoppingListId);

  revalidatePath(`/events/${parsed.data.eventId}`);
  revalidatePath(`/events/${parsed.data.eventId}/shopping`);
  revalidatePath("/dashboard");
}

export async function updateShoppingItemAction(formData: FormData) {
  const { supabase } = await requireUser();
  const parsed = updateShoppingItemSchema.safeParse({
    eventId: formData.get("eventId"),
    shoppingListId: formData.get("shoppingListId"),
    itemId: formData.get("itemId"),
    category: formData.get("category"),
    name: formData.get("name"),
    quantity: formData.get("quantity"),
    estimatedPrice: formData.get("estimatedPrice"),
    externalUrl: formData.get("externalUrl") || "",
    status: formData.get("status"),
  });

  if (!parsed.success) return;

  await supabase
    .from("shopping_items")
    .update({
      category: parsed.data.category,
      name: parsed.data.name,
      quantity: parsed.data.quantity,
      estimated_price: parsed.data.estimatedPrice ?? null,
      external_url: parsed.data.externalUrl || null,
      status: parsed.data.status,
    })
    .eq("id", parsed.data.itemId);

  await updateShoppingListEstimate(supabase, parsed.data.shoppingListId);

  revalidatePath(`/events/${parsed.data.eventId}`);
  revalidatePath(`/events/${parsed.data.eventId}/shopping`);
  revalidatePath("/dashboard");
}

export async function deleteShoppingItemAction(formData: FormData) {
  const { supabase } = await requireUser();
  const parsed = deleteShoppingItemSchema.safeParse({
    eventId: formData.get("eventId"),
    shoppingListId: formData.get("shoppingListId"),
    itemId: formData.get("itemId"),
  });

  if (!parsed.success) return;

  await supabase.from("shopping_items").delete().eq("id", parsed.data.itemId);
  await updateShoppingListEstimate(supabase, parsed.data.shoppingListId);

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

export async function updateTaskAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = updateTaskSchema.safeParse({
    eventId: formData.get("eventId"),
    taskId: formData.get("taskId"),
    title: formData.get("title"),
    dueLabel: formData.get("dueLabel") || "",
    phase: formData.get("phase") || "",
    status: formData.get("status"),
  });

  if (!parsed.success) return;

  await supabase
    .from("tasks")
    .update({
      title: parsed.data.title,
      due_label: parsed.data.dueLabel || null,
      phase: parsed.data.phase || null,
      status: parsed.data.status,
      completed_at: parsed.data.status === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.taskId);

  if (parsed.data.status === "completed") {
    await Promise.all([
      trackAnalyticsEvent(supabase, {
        eventName: "task_completed",
        userId: user.id,
        eventId: parsed.data.eventId,
        metadata: {
          task_id: parsed.data.taskId,
          completion_source: "edit",
        },
      }),
      createAuditLog(supabase, {
        action: "task_completed",
        userId: user.id,
        eventId: parsed.data.eventId,
        metadata: {
          task_id: parsed.data.taskId,
          completion_source: "edit",
        },
      }),
    ]);
  }

  revalidatePath(`/events/${parsed.data.eventId}`);
  revalidatePath(`/events/${parsed.data.eventId}/timeline`);
  revalidatePath("/dashboard");
}

export async function deleteTaskAction(formData: FormData) {
  const { supabase } = await requireUser();
  const parsed = deleteTaskSchema.safeParse({
    eventId: formData.get("eventId"),
    taskId: formData.get("taskId"),
  });

  if (!parsed.success) return;

  await supabase.from("tasks").delete().eq("id", parsed.data.taskId);

  revalidatePath(`/events/${parsed.data.eventId}`);
  revalidatePath(`/events/${parsed.data.eventId}/timeline`);
  revalidatePath("/dashboard");
}

export async function toggleTaskStatusAction(formData: FormData) {
  const { supabase, user } = await requireUser();
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

  if (parsed.data.nextStatus === "completed") {
    await Promise.all([
      trackAnalyticsEvent(supabase, {
        eventName: "task_completed",
        userId: user.id,
        eventId: parsed.data.eventId,
        metadata: {
          task_id: parsed.data.taskId,
          completion_source: "toggle",
        },
      }),
      createAuditLog(supabase, {
        action: "task_completed",
        userId: user.id,
        eventId: parsed.data.eventId,
        metadata: {
          task_id: parsed.data.taskId,
          completion_source: "toggle",
        },
      }),
    ]);
  }

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

export async function restorePlanVersionAction(formData: FormData) {
  const { supabase } = await requireUser();
  const parsed = restorePlanVersionSchema.safeParse({
    eventId: formData.get("eventId"),
    versionId: formData.get("versionId"),
  });

  if (!parsed.success) {
    redirect(
      `/events/${formData.get("eventId")}/settings?restoreError=${encodeURIComponent("Invalid plan version.")}`,
    );
  }

  try {
    const result = await restorePlanVersionForEvent(
      supabase,
      parsed.data.eventId,
      parsed.data.versionId,
    );

    [
      `/events/${parsed.data.eventId}`,
      `/events/${parsed.data.eventId}/invite`,
      `/events/${parsed.data.eventId}/shopping`,
      `/events/${parsed.data.eventId}/timeline`,
      `/events/${parsed.data.eventId}/settings`,
      "/dashboard",
    ].forEach((path) => revalidatePath(path));

    redirect(
      `/events/${parsed.data.eventId}/settings?restoreSuccess=${result.restoredVersion}`,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to restore that saved plan version.";
    redirect(
      `/events/${parsed.data.eventId}/settings?restoreError=${encodeURIComponent(message)}`,
    );
  }
}
