# Brain-Agent Wiring Contract

## Purpose

Map each agent to concrete Party Swami wiring points in the current codebase.

## Brain Entry Points

1. [`route.ts`](C:/Users/xpone/apps/party-swami/src/app/api/ai/one-click/route.ts)
2. [`route.ts`](C:/Users/xpone/apps/party-swami/src/app/api/ai/plan-event/route.ts)
3. [`brain.ts`](C:/Users/xpone/apps/party-swami/src/lib/ai/brain.ts)
4. [`workflows.ts`](C:/Users/xpone/apps/party-swami/src/lib/ai/workflows.ts)

## Wiring Map

1. `party-planning-agent`
   - Primary wiring: `generatePlanForEvent` in [`workflows.ts`](C:/Users/xpone/apps/party-swami/src/lib/ai/workflows.ts)
2. `invitation-card-agent`
   - Primary wiring: `generateInviteCopy` path in [`workflows.ts`](C:/Users/xpone/apps/party-swami/src/lib/ai/workflows.ts)
   - API support: [`route.ts`](C:/Users/xpone/apps/party-swami/src/app/api/ai/generate-invite-copy/route.ts)
3. `shopping-recommendation-agent`
   - Primary wiring: shopping generation/sync in [`workflows.ts`](C:/Users/xpone/apps/party-swami/src/lib/ai/workflows.ts)
   - API support: [`route.ts`](C:/Users/xpone/apps/party-swami/src/app/api/ai/shopping/route.ts)
4. `budget-agent`
   - Primary wiring: `allocateBudget` in [`brain.ts`](C:/Users/xpone/apps/party-swami/src/lib/ai/brain.ts)
   - API support: [`route.ts`](C:/Users/xpone/apps/party-swami/src/app/api/ai/budget/route.ts)
5. `task-reminder-agent`
   - Primary wiring: timeline/task synchronization in [`workflows.ts`](C:/Users/xpone/apps/party-swami/src/lib/ai/workflows.ts)
6. `rsvp-guest-agent`
   - Primary wiring: guest/rsvp flows in app routes and guest components; AI contract to be layered on top
7. `marketplace-vendor-agent`
   - Primary wiring: `matchVendorsForEvent` in [`brain.ts`](C:/Users/xpone/apps/party-swami/src/lib/ai/brain.ts)
   - API support: [`route.ts`](C:/Users/xpone/apps/party-swami/src/app/api/ai/vendors/route.ts)
8. `vendor-onboarding-agent`
   - Primary wiring target: marketplace onboarding actions (future AI wrapper)
9. `social-media-agent`
   - Primary wiring target: growth content pipeline (future phase)
10. `admin-growth-agent`
   - Primary wiring target: admin analytics insights (future phase)

## Brain Skill Integration Rule

`brain-orchestrator` becomes the policy layer that decides:
1. Which agent(s) to call.
2. Which calls can be parallelized.
3. How outputs merge into the one-click payload.

## Parallel Call Set (Current-Safe)

After party plan context is built:
1. `shopping-recommendation-agent`
2. `budget-agent`
3. `task-reminder-agent`
4. `invitation-card-agent`

## Required Next Code Changes

1. Add an internal `agentRegistry` object in `src/lib/ai/brain.ts`.
2. Add `agent_invocations` metadata block to one-click response.
3. Add contract tests to ensure stable merged output keys.

