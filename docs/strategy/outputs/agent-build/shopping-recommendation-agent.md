# Shopping Recommendation Agent Build Note

## Scope

This note documents the `shopping-recommendation-agent` contract for Party Swami `dev`/stage validation and brain wiring consistency.

## Skill Contract

1. Agent id
- `shopping-recommendation-agent`

2. Assigned skills (from `docs/strategy/agent-skill-assignment.yaml`)
- `product-recommendation`
- `category-mapping`
- `quantity-estimation`
- `affiliate-link-formatting`

3. Contract responsibility
- Generate category-based shopping recommendations.
- Produce quantity estimates suitable for direct persistence.
- Emit affiliate-ready shopping metadata for marketplace handoff.

## Expected Inputs

1. Required context
- Event seed: `title`, `event_type`, `event_date`, `location`, `guest_target`, `budget`, `theme`.

2. Optional context
- Plan context from `party_plans`: `theme`, `menu`, `shopping_categories`.
- User-provided `searchTerms` for shopping refinement.
- Replacement flow context for single-item swaps (category/name/quantity + feedback).

## Expected Outputs

1. Category output
- `shoppingCategories` runtime output and `shopping_categories` persisted form:
  - `Array<{ category: string; items: Array<{ name: string; quantity: number }> }>`

2. Item output
- Shopping items with:
  - `category`, `name`, `quantity`
  - `estimated_price`
  - `recommendation_reason`
  - `search_query`
  - `image_url`
  - `external_url` (affiliate-safe target)

3. Response summary output
- `addedCount`
- `estimatedTotal`

## Deterministic Guardrails

1. Stable shape
- Preserve exact field names and primitive types across runs.
- Keep `quantity` as integer `>= 1`.

2. Bounded generation
- Derive recommendations only from provided event/plan/search context.
- Do not claim real-time stock, shipping, or guaranteed pricing.

3. Marketplace safety
- Keep recommendations productizable and purchasable.
- Maintain affiliate-safe outbound link behavior and search-query traceability.

4. Merge compatibility
- Keep outputs compatible with brain payload keys used by one-click:
  - `shopping_list`
  - `shopping_categories`

## Mapped Wiring Points

1. Workflow core
- `src/lib/ai/workflows.ts`
  - `generateShoppingListForEvent(...)`
  - `replaceShoppingItemForEvent(...)`
  - `generatePlanForEvent(...)` / `revisePlanForEvent(...)` shopping sync paths

2. API surfaces
- `src/app/api/ai/shopping/route.ts`
- `src/app/api/ai/generate-shopping-list/route.ts`

3. Brain orchestration contract alignment (`docs/strategy/brain-agent-wiring-contract.md`)
- `src/lib/ai/brain.ts`
  - `generateAiBrainPlanForEvent(...)` invokes shopping generation and merges:
    - `shopping_list`
    - `shopping_categories`

## Validation Checklist

1. Skill file updated only for shopping agent.
2. Strategy alignment confirmed with:
- `docs/strategy/agent-skill-assignment.yaml`
- `docs/strategy/brain-agent-wiring-contract.md`
3. No production deploy, alias, or production config changes.
