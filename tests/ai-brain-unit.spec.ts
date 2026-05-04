import { expect, test } from "@playwright/test";
import { buildAgentInvocationPlan, buildAgentState } from "@/lib/ai/agent-orchestrator";
import { allocateBudget, applyBudgetConstraintsToShopping, applyBudgetConstraintsToVendors, detectReplan } from "@/lib/ai/brain";

test("budget allocation uses v1 weights and sums to total budget", () => {
  const allocation = allocateBudget({
    event_type: "birthday",
    budget: 500,
    guest_target: 20,
    location: "Dallas, TX",
  });

  expect(allocation.decor).toBeGreaterThan(0);
  expect(allocation.food).toBeGreaterThan(0);
  expect(allocation.entertainment).toBeGreaterThan(0);
  expect(allocation.misc).toBeGreaterThanOrEqual(0);

  const total = allocation.decor + allocation.food + allocation.entertainment + allocation.misc;
  expect(Number(total.toFixed(2))).toBe(500);
});

test("budget allocation returns zeros when no budget is set", () => {
  const allocation = allocateBudget({
    event_type: "birthday",
    budget: null,
    guest_target: 20,
    location: "Dallas, TX",
  });

  expect(allocation).toEqual({
    decor: 0,
    food: 0,
    entertainment: 0,
    misc: 0,
  });
});

test("budget overrun scenario applies shopping substitutions", () => {
  const result = applyBudgetConstraintsToShopping([
    { category: "Decor", name: "Premium Balloons", quantity: 8, estimated_price: 40, recommendation_reason: "", search_query: "", image_url: null, external_url: null },
    { category: "Food", name: "Dessert Tray", quantity: 5, estimated_price: 35, recommendation_reason: "", search_query: "", image_url: null, external_url: null },
  ], 200, { decor: 40, food: 60, entertainment: 60, misc: 40 });

  expect(result.adjusted).toBeTruthy();
  expect(result.total).toBeLessThanOrEqual(130);
});

test("vendor scarcity scenario keeps original matches when no affordable fallback exists", () => {
  const result = applyBudgetConstraintsToVendors([
    { vendor_id: "v1", slug: "v1", business_name: "Vendor 1", category: "DJ", score: 80, recommended: true, rationale: { rating: 0.8, price_fit: 0.6, distance: 0.6, availability: 0.8 }, location: "Dallas, TX", starting_price: 900 },
  ], { decor: 50, food: 50, entertainment: 50, misc: 50 });

  expect(result.adjusted).toBeFalsy();
  expect(result.matches).toHaveLength(1);
});

test("guest count surge triggers selective replanning", () => {
  const replan = detectReplan(
    {
      id: "evt",
      owner_id: "own",
      title: "Party",
      event_type: "birthday",
      event_date: null,
      location: "Dallas, TX",
      guest_target: 60,
      budget: 500,
      theme: "Neon",
      ai_decision_mode: "approve",
    },
    { event_context: { event_type: "birthday", location: "Dallas, TX", guest_target: 20, budget: 500, theme: "Neon" } },
    false,
  );

  expect(replan.trigger).toBe("context_change");
  expect(replan.changedFields).toContain("guest_target");
  expect(replan.impactedAgents).toContain("shopping-recommendation-agent");
});

test("approve vs full_auto mode is reflected in agent state", () => {
  const invocations = buildAgentInvocationPlan({
    eventType: "birthday",
    location: "Dallas, TX",
    budget: 400,
    guestTarget: 20,
    theme: "Retro",
  });

  const approveState = buildAgentState({ eventType: "birthday", location: "Dallas, TX", budget: 400, guestTarget: 20, theme: "Retro" }, invocations, "approve");
  const fullAutoState = buildAgentState({ eventType: "birthday", location: "Dallas, TX", budget: 400, guestTarget: 20, theme: "Retro" }, invocations, "full_auto");

  expect(approveState.decision_mode).toBe("approve");
  expect(fullAutoState.decision_mode).toBe("full_auto");
});
