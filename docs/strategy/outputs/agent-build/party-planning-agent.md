# Party Planning Agent Build Note

## Scope

This note covers only `party-planning-agent` for dev/stage validation. No production deployment or production alias behavior is included.

## Skill Contract

`party-planning-agent` is the canonical plan generator that transforms event context into stable planning outputs used by downstream marketplace and orchestration flows.

- Owns plan synthesis (theme, invite copy seed, menu, checklist/task seeds, timeline seeds, shopping category seeds).
- Does not own vendor ranking, budget allocation, social content, or onboarding scoring.
- Must provide deterministic keys and merge-safe structures for `brain-orchestrator`.

## Expected Inputs

Required event context fields:

- `event_id`
- `title`
- `event_type`
- `event_date`
- `location`
- `guest_target` (or guest-count fallback from DB)
- `budget`
- `theme`

## Expected Outputs

Deterministic response contract (stable key names):

- `theme: string`
- `inviteCopy: string`
- `menu: string[]`
- `shoppingCategories: { category: string; items: { name: string; quantity: number }[] }[]`
- `tasks: { title: string; due_label: string; phase: string }[]`
- `timeline: { label: string; detail: string; sort_order: number }[]`
- `synced: { shoppingItemsAdded: number; tasksAdded: number; timelineAdded: number; estimatedTotal: number; cacheHit: boolean }`

## Deterministic Guardrails

- Stable top-level keys and array object key names.
- Positive integer quantities for shopping items.
- Explicit timeline ordering via `sort_order`.
- No placeholder task/timeline items.
- Budget-aware and guest-aware outputs.
- Marketplace alignment through usable shopping categories and practical planning detail.
- Cache-safe replay behavior when request fingerprint + prompt version + model match.

## Mapped Wiring Points

Primary code wiring for this agent:

1. `src/lib/ai/workflows.ts`
- `generatePlanForEvent(...)` is the core planning implementation.
2. `src/lib/ai/brain.ts`
- `generateAiBrainPlanForEvent(...)` composes this plan into one-click brain output.
3. `src/app/api/ai/plan-event/route.ts`
- API route that invokes brain generation for plan event flow.
4. `src/app/api/ai/one-click/route.ts`
- API route that invokes one-click plan flow and telemetry.

Strategy alignment sources:

- `docs/strategy/agent-skill-assignment.yaml`
- `docs/strategy/brain-agent-wiring-contract.md`
