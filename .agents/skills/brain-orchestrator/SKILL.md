---
name: brain-orchestrator
description: Party Swami orchestration skill for routing event requests to specialized agents, merging outputs, and enforcing deterministic response contracts and safety guardrails.
---

# Brain Orchestrator

## Use When

- Request targets one-click or end-to-end AI planning for an event.
- Workflow needs multi-capability orchestration across planning + marketplace outputs.
- Caller needs a deterministic, merge-safe response envelope from multiple internal agent modules.

## Agent Registry

1. `party-planning-agent`
2. `invitation-card-agent`
3. `shopping-recommendation-agent`
4. `budget-agent`
5. `task-reminder-agent`
6. `rsvp-guest-agent`
7. `marketplace-vendor-agent`
8. `vendor-onboarding-agent`
9. `social-media-agent`
10. `admin-growth-agent`

## Orchestration Contract

- Product alignment: Always optimize for Party Swami as a `marketplace + AI planning platform`.
- Scope: This orchestrator is the policy/router layer; it does not invent new top-level response fields outside the contract.
- Determinism: For identical event state and deterministic downstream outputs, preserve key set, key names, and merge order.
- Safety: Never present fabricated real-world vendor facts, prices, or availability as verified truth.

## Dispatch Policy (Current Wiring)

1. Validate event context.
2. Route to `party-planning-agent` first to establish baseline plan context.
3. Run current-safe parallel set after baseline context exists:
   - `shopping-recommendation-agent`
   - `budget-agent`
   - `task-reminder-agent`
   - `invitation-card-agent`
4. Run `marketplace-vendor-agent` for marketplace matching in one-click flow.
5. Run `rsvp-guest-agent` only when RSVP/guest-specific workflow is explicitly requested.
6. Merge results into a single deterministic response envelope.

## Output Contract (Current Required Top-Level Keys)

Return deterministic top-level fields:
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

Do not require `invite_content`, `task_summary`, or `rsvp_summary` in the brain one-click envelope unless wiring contract is explicitly expanded.

## Input Contract (Current One-Click Entry)

- `eventId` (UUID, required)
- `turnstileToken` (required)
- `forceRegenerate` (optional boolean; defaults `false`)

## Deterministic Guardrails

- Preserve stable merge precedence:
  1. baseline plan context
  2. shopping normalization
  3. budget allocation
  4. vendor matching
- Keep numeric outputs normalized:
  - Budget values rounded to 2 decimals.
  - Score fields bounded to expected ranges.
- Keep list limits deterministic:
  - Vendor match list capped to current expected size and sorted by score logic.
- On missing marketplace data, use configured fallback behavior rather than throwing non-deterministic partial shapes.

## Constraints

- Never invent concrete vendor/pricing facts.
- Never leak cross-project assumptions, secrets, or environment config.
- Keep behavior deterministic and contract-stable.
- Preserve Party Swami marketplace + AI planning alignment.
