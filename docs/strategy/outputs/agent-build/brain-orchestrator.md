# Brain Orchestrator Build Note (Dev)

## Skill Contract

- Skill id: `brain-orchestrator`
- Role: policy/orchestration layer that routes multi-capability event generation and merges outputs into one deterministic envelope.
- Strategy alignment source of truth:
  - `docs/strategy/agent-skill-assignment.yaml`
  - `docs/strategy/brain-agent-wiring-contract.md`
- Marketplace alignment requirement: include both planning and vendor/commerce outcomes in orchestrated output.

## Expected Inputs and Outputs

### Inputs (current one-click wiring)

- `eventId: string` (UUID, required)
- `turnstileToken: string` (required)
- `forceRegenerate?: boolean` (optional; default `false`)

Primary entrypoint:
- `src/app/api/ai/one-click/route.ts` -> `POST`

### Outputs (current brain envelope keys)

- `event_id`
- `plan_version`
- `generated_at`
- `complexity_score`
- `timeline`
- `shopping_list`
- `shopping_categories`
- `budget_allocation`
- `vendor_matches`
- `required_vendor_categories`

Return shape is produced by:
- `src/lib/ai/brain.ts` -> `generateAiBrainPlanForEvent`

## Deterministic Guardrails

- Keep output keyset contract-stable; do not add/remove top-level keys without wiring-contract update.
- Merge precedence:
  1. baseline plan generation
  2. shopping generation/normalization
  3. budget allocation
  4. vendor matching
- Numeric determinism:
  - budget buckets rounded to 2 decimals
  - bounded scoring logic for complexity and vendor fit
- Fallback determinism:
  - if vendor marketplace data is empty, return deterministic fallback vendor list shape
- Safety determinism:
  - do not emit fabricated verified vendor facts, availability, or pricing guarantees

## Mapped Code Wiring Points

- `src/app/api/ai/one-click/route.ts`
  - validates request contract and auth/limits
  - invokes `generateAiBrainPlanForEvent`
- `src/app/api/ai/plan-event/route.ts`
  - baseline plan generation path supporting planning agent behavior
- `src/lib/ai/brain.ts`
  - `allocateBudget`
  - `matchVendorsForEvent`
  - `generateAiBrainPlanForEvent`
- `src/lib/ai/workflows.ts`
  - `generatePlanForEvent`
  - `generateShoppingListForEvent`
  - synchronization of plan/timeline/tasks/shopping records
- Supporting API surfaces from assignment map:
  - `src/app/api/ai/shopping/route.ts`
  - `src/app/api/ai/generate-shopping-list/route.ts`
  - `src/app/api/ai/vendors/route.ts`
  - `src/app/api/ai/budget/route.ts`

## Notes

- This build note is scoped to `dev`/`stage` validation usage.
- No production deploy, alias, or production config action is part of this update.
