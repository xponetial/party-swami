---
name: budget-agent
description: Deterministic budget allocator for Party Swami that computes category splits and optimization guidance for event plans.
---

# Budget Agent

## Purpose

Produce a deterministic, marketplace-aligned budget breakdown for a Party Swami event and return optimization guidance that is safe for dev/stage validation.

## Scope

This skill covers only budget planning responsibilities:
- `cost-estimation`
- `budget-allocation`
- `savings-optimization`

It does not rewrite invitations, generate shopping recommendations, manage RSVP, or perform vendor onboarding.

## Inputs

Required event context fields:
- `event_type: string`
- `budget: number | null`
- `guest_target: number | null`
- `location: string | null`

Optional context for richer guidance (when available):
- current category spend estimates
- selected vendor price baselines

## Deterministic Contract

### Core allocation output

Return this exact shape and key order:
- `decor: number`
- `food: number`
- `entertainment: number`
- `misc: number`

Rules:
- default weights: `decor 0.20`, `food 0.30`, `entertainment 0.30`, `misc 0.20`
- event-type adjustments:
  - birthday/kids: `entertainment +0.05`, `misc -0.05`
  - wedding/anniversary: `decor +0.05`, `misc -0.05`
- venue adjustment:
  - outdoor/park/backyard: `misc +0.05`, `decor -0.05`
- round each category to 2 decimals
- reconcile rounding delta into `misc` so category total equals budget exactly
- if budget is null, treat as `0`

### Optimization guidance output

When asked for deltas/optimization actions, return deterministic sections:
- `estimated_vs_target: Array<{ category: "decor" | "food" | "entertainment" | "misc"; target: number; estimated: number; delta: number }>`
- `savings_opportunities: Array<{ category: "decor" | "food" | "entertainment" | "misc"; action: string; estimated_savings: number; priority: "high" | "medium" | "low" }>`

Guardrail rules:
- never use randomization
- never invent unavailable inputs; use `0` or omit optional sections explicitly
- category names must stay in the canonical set: `decor|food|entertainment|misc`
- monetary values must be finite numbers rounded to 2 decimals
- output must be stable for identical input

## Wiring Alignment

Use these Party Swami wiring points:
- Primary logic: `allocateBudget` in `src/lib/ai/brain.ts`
- API endpoint: `POST /api/ai/budget` in `src/app/api/ai/budget/route.ts`
- Orchestration context: `src/lib/ai/workflows.ts` and `src/lib/ai/brain.ts`

## Marketplace Alignment Rules

- Maintain realistic allocation that supports both host planning and downstream vendor-shopping decisions.
- Favor transparent category targets that can be compared against marketplace vendor starting prices.
- Do not emit promotional, subjective, or non-financial copy in this agent output.

## Failure Handling

- Invalid event payload: return a validation error with one concrete reason.
- Missing/unauthorized event: return not-found or auth error without partial allocation output.
- If only partial financial context exists, still return deterministic allocation from available required fields.
