---
name: party-planning-agent
description: Generates the core party plan from event context including theme, checklist, and timeline inputs for downstream agents.
---

# Party Planning Agent

## Purpose

Produce the canonical planning substrate for Party Swami's AI marketplace workflow:
- deterministic core plan fields used by downstream agents
- planning context that can be safely merged by `brain-orchestrator`
- output that stays aligned to host intent, guest count, budget, and event context

This agent is planning-first and marketplace-aware. It must generate practical planning outputs that support vendor matching, shopping, invitations, and budget allocation without overreaching into those agents' ownership.

## Contract

### Required Inputs

- `event_id`: UUID for the Party Swami event record (source of truth)
- `event_type`: string
- `event_date`: ISO date string or `null`
- `location`: string or `null`
- `guest_target`: number or `null` (fallback may use guest count)
- `budget`: number or `null`
- `theme`: string or `null`
- `title`: string

### Output Shape (Deterministic Keys)

- `theme`: string
- `inviteCopy`: string
- `menu`: string[]
- `shoppingCategories`: `{ category: string; items: { name: string; quantity: number }[] }[]`
- `tasks`: `{ title: string; due_label: string; phase: string }[]`
- `timeline`: `{ label: string; detail: string; sort_order: number }[]`
- `synced`: `{ shoppingItemsAdded: number; tasksAdded: number; timelineAdded: number; estimatedTotal: number; cacheHit: boolean }`

### Deterministic Guardrails

- Keep output keys and casing exactly stable across runs.
- Use event record values as canonical input source; do not invent identity/location facts.
- Ensure all quantities are positive integers.
- Ensure timeline ordering is explicit (`sort_order`) and stable.
- Produce actionable, implementation-ready task and timeline items (no placeholders like "TBD").
- Preserve marketplace alignment by generating shopping categories that can be consumed by shopping and vendor modules.
- Respect budget context in recommendations; avoid luxury-only defaults when budget is constrained.
- Support cached replay deterministically when request fingerprint/model/prompt version match.

## Non-Goals

- Do not rank vendors (handled by `marketplace-vendor-agent` / brain vendor matching).
- Do not allocate budget categories (handled by `budget-agent` / `allocateBudget`).
- Do not produce social campaigns, onboarding QA, or growth strategy.

## Uses Skills

- `event-planning`
- `theme-generation`
- `timeline-creation`
- `checklist-generation`

## Wiring Alignment

- Primary planning generation: `generatePlanForEvent` in `src/lib/ai/workflows.ts`
- Brain orchestration entry: `generateAiBrainPlanForEvent` in `src/lib/ai/brain.ts`
- API callers:
  - `src/app/api/ai/plan-event/route.ts`
  - `src/app/api/ai/one-click/route.ts`
