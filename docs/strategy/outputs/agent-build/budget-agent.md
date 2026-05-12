# Budget Agent Build Note

## Skill Contract

`budget-agent` is the deterministic financial module for Party Swami planning flows. It owns:
- `cost-estimation`
- `budget-allocation`
- `savings-optimization`

It must produce stable category allocations and budget optimization guidance using only financial/event context, aligned to marketplace planning decisions.

## Expected Inputs

Minimum required input contract:
- `event_type: string`
- `budget: number | null`
- `guest_target: number | null`
- `location: string | null`

Auth and ownership constraints for API execution:
- signed-in user required
- event must belong to user (`owner_id` match)
- turnstile token required on `/api/ai/budget`

## Expected Outputs

Primary deterministic payload:
- `budget_allocation: { decor: number; food: number; entertainment: number; misc: number }`

Current API response shape from `/api/ai/budget`:
- `{ ok: true, event_id: string, budget_allocation: BudgetAllocation }`

Optional extended skill output sections (when explicitly requested by orchestrator):
- `estimated_vs_target`
- `savings_opportunities`

## Deterministic Guardrails

- Fixed base weights: decor 20%, food 30%, entertainment 30%, misc 20%
- Event-type adjustments:
  - birthday/kids: entertainment +5%, misc -5%
  - wedding/anniversary: decor +5%, misc -5%
- Venue adjustment:
  - outdoor/park/backyard: misc +5%, decor -5%
- Round to 2 decimals
- Reconcile rounding remainder into `misc` so totals match budget exactly
- Null budget must be treated as `0`
- Canonical category keys only: `decor|food|entertainment|misc`
- No randomized output, no speculative category creation

## Mapped Code Wiring Points

Primary implementation and consumers:
- `src/lib/ai/brain.ts`
  - `allocateBudget(...)`
  - `generateAiBrainPlanForEvent(...)` includes `budget_allocation`
- `src/app/api/ai/budget/route.ts`
  - validates payload (`eventId`, `turnstileToken`)
  - checks auth and event ownership
  - calls `allocateBudget`
  - persists `party_plans.budget_allocation`
- `docs/strategy/agent-skill-assignment.yaml`
  - maps `budget-agent` to financial skills and budget wiring target
- `docs/strategy/brain-agent-wiring-contract.md`
  - defines `budget-agent` primary wiring at `allocateBudget` + `/api/ai/budget`

## Dev/Stage Validation Checklist

- deterministic repeatability: identical input -> identical allocation
- sum integrity: category sum equals source budget after rounding
- auth guard: unauthenticated call returns 401
- ownership guard: non-owner event access denied
- bad payload returns 400 with validation error
