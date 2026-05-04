export type BrainAgentId =
  | "brain-orchestrator"
  | "party-planning-agent"
  | "invitation-card-agent"
  | "shopping-recommendation-agent"
  | "budget-agent"
  | "task-reminder-agent"
  | "rsvp-guest-agent"
  | "marketplace-vendor-agent"
  | "vendor-onboarding-agent"
  | "social-media-agent"
  | "admin-growth-agent";

export type BrainAgentInvocation = {
  agent_id: BrainAgentId;
  status: "invoked" | "standby";
  reason: string;
  wired_to: string[];
};

export type BrainEventContext = {
  eventType: string;
  location: string | null;
};

type AgentRegistryEntry = {
  id: BrainAgentId;
  wiredTo: string[];
};

const AGENT_REGISTRY: AgentRegistryEntry[] = [
  { id: "brain-orchestrator", wiredTo: ["src/lib/ai/brain.ts"] },
  { id: "party-planning-agent", wiredTo: ["src/lib/ai/workflows.ts#generatePlanForEvent"] },
  {
    id: "invitation-card-agent",
    wiredTo: [
      "src/lib/ai/workflows.ts#generatePlanForEvent",
      "src/app/api/ai/generate-invite-copy/route.ts",
      "src/app/api/ai/generate-invite-image/route.ts",
    ],
  },
  {
    id: "shopping-recommendation-agent",
    wiredTo: [
      "src/lib/ai/workflows.ts#generateShoppingListForEvent",
      "src/app/api/ai/shopping/route.ts",
      "src/app/api/ai/generate-shopping-list/route.ts",
    ],
  },
  {
    id: "budget-agent",
    wiredTo: ["src/lib/ai/brain.ts#allocateBudget", "src/app/api/ai/budget/route.ts"],
  },
  {
    id: "task-reminder-agent",
    wiredTo: ["src/lib/ai/workflows.ts#syncTimeline", "src/lib/ai/workflows.ts#syncTasks"],
  },
  { id: "rsvp-guest-agent", wiredTo: ["src/app/rsvp/[slug]/actions.ts", "src/components/guests/guest-list-card.tsx"] },
  { id: "marketplace-vendor-agent", wiredTo: ["src/lib/ai/brain.ts#matchVendorsForEvent", "src/app/api/ai/vendors/route.ts"] },
  { id: "vendor-onboarding-agent", wiredTo: ["src/app/partners/signup/page.tsx", "src/app/marketplace/actions.ts"] },
  { id: "social-media-agent", wiredTo: ["src/lib/admin.ts"] },
  { id: "admin-growth-agent", wiredTo: ["src/lib/admin.ts"] },
];

function isEventTypeWorthVendors(eventType: string) {
  const normalized = eventType.toLowerCase();
  return /birthday|wedding|anniversary|corporate|gala|baby|bridal|holiday/.test(normalized);
}

export function buildAgentInvocationPlan(context: BrainEventContext): BrainAgentInvocation[] {
  const vendorEnabled = isEventTypeWorthVendors(context.eventType);
  const hasLocation = Boolean(context.location?.trim());

  const invoked = new Set<BrainAgentId>([
    "brain-orchestrator",
    "party-planning-agent",
    "invitation-card-agent",
    "shopping-recommendation-agent",
    "budget-agent",
    "task-reminder-agent",
    "rsvp-guest-agent",
  ]);

  if (vendorEnabled) {
    invoked.add("marketplace-vendor-agent");
    invoked.add("vendor-onboarding-agent");
  }

  // Growth agents are wired but remain standby during event-scoped one-click generation.
  return AGENT_REGISTRY.map((agent) => {
    const isInvoked = invoked.has(agent.id);
    let reason = isInvoked ? "Included in current AI brain execution path." : "Wired to brain but not required for this event-scoped run.";

    if (agent.id === "marketplace-vendor-agent" && !vendorEnabled) {
      reason = "Standby because event type does not require vendor automation.";
    }
    if (agent.id === "vendor-onboarding-agent" && !vendorEnabled) {
      reason = "Standby because vendor onboarding is supply-side and not needed for this request.";
    }
    if (agent.id === "marketplace-vendor-agent" && vendorEnabled && !hasLocation) {
      reason = "Invoked with limited locality precision because location is missing.";
    }

    return {
      agent_id: agent.id,
      status: isInvoked ? "invoked" : "standby",
      reason,
      wired_to: agent.wiredTo,
    };
  });
}

