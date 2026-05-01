import { expect, test } from "@playwright/test";
import { allocateBudget } from "@/lib/ai/brain";

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
