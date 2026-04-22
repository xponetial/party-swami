export const APP_NAME = "Party Swami";

export const EVENT_STATUSES = ["draft", "planning", "ready", "completed"] as const;

export const ANALYTICS_EVENTS = [
  "account_created",
  "event_created",
  "ai_plan_generated",
  "invite_sent",
  "rsvp_received",
  "shopping_link_clicked",
  "shopping_pick_replaced",
  "task_completed",
  "feedback_submitted",
  "marketplace_viewed",
  "marketplace_lead_submitted",
  "marketplace_lead_status_updated",
  "marketplace_provider_status_updated",
] as const;
