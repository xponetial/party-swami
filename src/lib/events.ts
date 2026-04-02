import { cache } from "react";
import { notFound } from "next/navigation";
import type { InviteDesignData } from "@/lib/invite-design";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type EventDetails = {
  id: string;
  title: string;
  event_type: string;
  event_date: string | null;
  completed_at: string | null;
  location: string | null;
  guest_target: number | null;
  budget: number | null;
  theme: string | null;
  status: "draft" | "planning" | "ready" | "completed";
};

export type InviteDetails = {
  id: string;
  design_json: InviteDesignData | null;
  invite_copy: string | null;
  public_slug: string;
  is_public: boolean;
  sent_at: string | null;
};

export type PartyPlanDetails = {
  id: string;
  theme: string | null;
  invite_copy: string | null;
  menu: string[] | null;
  shopping_categories:
    | Array<{ category: string; items: Array<{ name: string; quantity: number }> }>
    | null;
  tasks: Array<{ title: string; due_label: string }> | null;
  timeline: Array<{ label: string; detail: string }> | null;
  model?: string | null;
  prompt_version?: string | null;
  summary?: string | null;
  generated_at?: string | null;
};

export type GuestDetails = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: "pending" | "confirmed" | "declined";
  plus_one_count: number;
  last_contacted_at: string | null;
  rsvp_token: string;
};

export type ShoppingListDetails = {
  id: string;
  retailer: "amazon" | "walmart" | "mixed" | null;
  estimated_total: number;
};

export type ShoppingItemDetails = {
  id: string;
  category: string;
  name: string;
  quantity: number;
  estimated_price: number | null;
  status: "pending" | "ready" | "purchased" | "removed";
  external_url: string | null;
};

export type TaskDetails = {
  id: string;
  title: string;
  due_at: string | null;
  due_label: string | null;
  phase: string | null;
  status: "pending" | "completed" | "overdue";
};

export type TimelineItemDetails = {
  id: string;
  label: string;
  detail: string;
  starts_at: string | null;
  sort_order: number;
};

export type PlanVersionDetails = {
  id: string;
  version_num: number;
  change_reason: string | null;
  created_at: string;
};

export type GuestMessageDetails = {
  id: string;
  guest_id: string | null;
  message_type: "invite" | "reminder" | "follow_up" | "note";
  subject: string | null;
  body: string | null;
  sent_at: string | null;
  metadata: {
    resend_id?: string;
    rsvp_url?: string;
    send_mode?: string;
    delivery_type?: string;
  } | null;
  guest?: {
    name: string;
    email: string | null;
  } | null;
};

export const getEventContext = cache(async (eventId: string) => {
  const supabase = await createSupabaseServerClient();

  const [{ data: event, error: eventError }, { data: profile }] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, event_type, event_date, completed_at, location, guest_target, budget, theme, status")
      .eq("id", eventId)
      .single<EventDetails>(),
    supabase
      .from("profiles")
      .select("id, full_name, plan_tier")
      .maybeSingle<{ id: string; full_name: string | null; plan_tier: string | null }>(),
  ]);

  if (eventError || !event) {
    notFound();
  }

  const [
    { data: invite },
    { data: plan },
    { data: guests = [] },
    { data: shoppingList },
    { data: tasks = [] },
    { data: timelineItems = [] },
    { data: guestMessages = [] },
  ] = await Promise.all([
    supabase
      .from("invites")
      .select("id, design_json, invite_copy, public_slug, is_public, sent_at")
      .eq("event_id", eventId)
      .maybeSingle<InviteDetails>(),
    supabase
      .from("party_plans")
      .select("id, theme, invite_copy, menu, shopping_categories, tasks, timeline, model, prompt_version, summary, generated_at")
      .eq("event_id", eventId)
      .maybeSingle<PartyPlanDetails>(),
    supabase
      .from("guests")
      .select("id, name, email, phone, status, plus_one_count, last_contacted_at, rsvp_token")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true })
      .returns<GuestDetails[]>(),
    supabase
      .from("shopping_lists")
      .select("id, retailer, estimated_total")
      .eq("event_id", eventId)
      .maybeSingle<ShoppingListDetails>(),
    supabase
      .from("tasks")
      .select("id, title, due_at, due_label, phase, status")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true })
      .returns<TaskDetails[]>(),
    supabase
      .from("timeline_items")
      .select("id, label, detail, starts_at, sort_order")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true })
      .returns<TimelineItemDetails[]>(),
    supabase
      .from("guest_messages")
      .select("id, guest_id, message_type, subject, body, sent_at, metadata, guest:guests(name, email)")
      .eq("event_id", eventId)
      .order("sent_at", { ascending: false })
      .limit(8)
      .returns<GuestMessageDetails[]>(),
  ]);

  const planVersions = plan
    ? (
        await supabase
          .from("plan_versions")
          .select("id, version_num, change_reason, created_at")
          .eq("plan_id", plan.id)
          .order("created_at", { ascending: false })
          .limit(5)
          .returns<PlanVersionDetails[]>()
      ).data ?? []
    : [];

  const shoppingItems = shoppingList
    ? (
        await supabase
          .from("shopping_items")
          .select("id, category, name, quantity, estimated_price, status, external_url")
          .eq("shopping_list_id", shoppingList.id)
          .order("sort_order", { ascending: true })
          .returns<ShoppingItemDetails[]>()
      ).data ?? []
    : [];

  return {
    event,
    invite,
    plan,
    guests: guests ?? [],
    shoppingList,
    shoppingItems,
    tasks: tasks ?? [],
    timelineItems: timelineItems ?? [],
    profile: profile ?? null,
    planVersions: planVersions ?? [],
    guestMessages: guestMessages ?? [],
  };
});
