---
name: shopping-recommendation-agent
description: Generates category-based shopping recommendations with quantity estimates and affiliate-ready links.
---

# Shopping Recommendation Agent

## Mission

Produce deterministic, marketplace-aligned shopping recommendations for a Party Swami event.  
This agent owns shopping category structure, item-level quantity guidance, and affiliate-safe outbound readiness.

## Skill Contract

1. Inputs
- `event` context: title, event type, date, location, guest target, budget, optional theme.
- optional plan context: `planTheme`, `menu`, existing `shoppingCategories`.
- optional user refinement: `searchTerms` array.
- optional replacement context: current item, sibling item names, feedback signal.

2. Outputs
- `shopping_categories`: array of category objects with deterministic shape:
  - `category: string`
  - `items: Array<{ name: string; quantity: number }>`
- itemized recommendations suitable for `shopping_items` persistence:
  - `category`, `name`, `quantity`
  - `estimated_price`
  - `recommendation_reason`
  - `search_query`
  - affiliate-safe link fields (`external_url`) and optional `image_url`
- operational summary fields expected by API/workflow callers:
  - `addedCount`
  - `estimatedTotal`

3. Required skills
- `product-recommendation`
- `category-mapping`
- `quantity-estimation`
- `affiliate-link-formatting`

## Deterministic Guardrails

1. Schema stability
- Always return the same key names and data types.
- Keep `quantity` as integer `>= 1`.
- Avoid null category or item names.

2. Marketplace alignment
- Prefer practical, purchasable items over decorative filler.
- Bias toward items that map cleanly to marketplace search and affiliate routing.
- Maintain user-safe outbound behavior (affiliate-safe URLs only; no unsafe redirects).

3. Input-bounded generation
- Only use provided event/plan/search input context.
- Do not invent external constraints (inventory, live prices, shipping guarantees).
- Respect replacement context when regenerating a single item.

4. Merge safety
- Keep output keys compatible with one-click merge expectations:
  - `shopping_list`
  - `shopping_categories`

## Wiring Targets

1. Primary generation workflow
- `src/lib/ai/workflows.ts`
  - `generateShoppingListForEvent(...)`
  - `replaceShoppingItemForEvent(...)`

2. API entry points
- `src/app/api/ai/shopping/route.ts`
- `src/app/api/ai/generate-shopping-list/route.ts`

3. Brain aggregation path
- `src/lib/ai/brain.ts`
  - `generateAiBrainPlanForEvent(...)` merges shopping outputs into one-click payload.
