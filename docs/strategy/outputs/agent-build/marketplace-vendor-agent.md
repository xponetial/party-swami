# Marketplace Vendor Agent Build Note

## Skill Contract

`marketplace-vendor-agent` owns deterministic vendor matching and ranking for Party Swami marketplace flows.

It maps to the strategy assignment:
- Agent: `marketplace-vendor-agent`
- Skills: `vendor-matching`, `lead-generation`, `vendor-comparison`

## Expected Inputs/Outputs

### Inputs

- `event`: `event_type`, `budget`, `guest_target`, `location`
- `budget_allocation`: `decor`, `food`, `entertainment`, `misc`
- marketplace vendor candidate rows
- approved marketplace review rows

### Outputs

- `required_vendor_categories`: `string[]`
- `vendor_matches`: ranked array (max 6) with:
  - `vendor_id`, `slug`, `business_name`, `category`
  - `score`, `recommended`
  - `rationale` (`rating`, `price_fit`, `distance`, `availability`)
  - `location`, `starting_price`
- `lead_message_seeds`: concise outreach starters for recommended matches

## Deterministic Guardrails

- Fixed scoring weights:
  - rating `0.4`
  - price fit `0.3`
  - distance `0.2`
  - availability `0.1`
- Stable ranking for identical inputs:
  - primary sort `score DESC`
  - tie-break `vendor_id ASC`
- Coverage-first category fill, then ranked fill to hard cap of 6.
- No fabricated vendors/reviews/pricing/availability.
- Fallback path only when vendor dataset is empty, with explicit fallback semantics.
- Response shape is fixed to contract keys to avoid orchestration drift.

## Mapped Code Wiring Points

Primary wiring from strategy contract and current code:

1. Vendor match engine:
   - `matchVendorsForEvent` in [brain.ts](C:/Users/xpone/apps/party-swami/src/lib/ai/brain.ts)
2. Budget input dependency:
   - `allocateBudget` in [brain.ts](C:/Users/xpone/apps/party-swami/src/lib/ai/brain.ts)
3. API surface:
   - `POST /api/ai/vendors` in [route.ts](C:/Users/xpone/apps/party-swami/src/app/api/ai/vendors/route.ts)
4. One-click aggregate flow:
   - `generateAiBrainPlanForEvent` consumption of vendor output in [brain.ts](C:/Users/xpone/apps/party-swami/src/lib/ai/brain.ts)
5. Brain/orchestration anchors:
   - [workflows.ts](C:/Users/xpone/apps/party-swami/src/lib/ai/workflows.ts)
   - [route.ts](C:/Users/xpone/apps/party-swami/src/app/api/ai/one-click/route.ts)

## Notes

- Scope is limited to dev/stage-safe skill behavior; no production deployment or alias actions are part of this change.
- This build note intentionally reflects current deterministic marketplace matching behavior and wiring expectations for brain-orchestrator integration.
