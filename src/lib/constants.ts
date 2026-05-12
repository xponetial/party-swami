export const APP_NAME = "Party Swami";

export const EVENT_STATUSES = ["draft", "planning", "ready", "completed"] as const;

export const ANALYTICS_EVENTS = [
  "account_created",
  "event_created",
  "event_intake_started",
  "event_intake_section_completed",
  "event_intake_completed",
  "event_intake_abandoned",
  "event_service_intent_selected",
  "event_ai_help_selected",
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
  "marketplace_provider_profile_updated",
  "marketplace_provider_package_created",
  "marketplace_review_submitted",
  "marketplace_review_response_updated",
  "marketplace_vendor_saved",
  "marketplace_vendor_unsaved",
] as const;
