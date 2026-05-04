---
name: marketplace-vendor-agent
description: Matches event needs to vendor options and produces ranked recommendations with rationale.
---

# Marketplace Vendor Agent

## Mission

Produce deterministic, marketplace-first vendor recommendations for an event by:
- matching required categories to qualified vendors
- ranking candidates with transparent scoring rationale
- generating concise lead-message seeds for host outreach

This skill is scoped to Party Swami marketplace behavior and must align with:
- `docs/strategy/agent-skill-assignment.yaml`
- `docs/strategy/brain-agent-wiring-contract.md`

## Contract

### Inputs

- `event`:
  - `event_type` (string)
  - `budget` (number | null)
  - `guest_target` (number | null)
  - `location` (string | null)
- `budget_allocation`:
  - `decor` (number)
  - `food` (number)
  - `entertainment` (number)
  - `misc` (number)
- `vendors` (candidate vendor rows from marketplace source)
- `reviews` (approved marketplace review data)

### Outputs

- `required_vendor_categories` (string[])
- `vendor_matches` (array, max 6), each containing:
  - `vendor_id`, `slug`, `business_name`, `category`
  - `score` (0-100)
  - `recommended` (boolean)
  - `rationale`: `rating`, `price_fit`, `distance`, `availability` (0-1)
  - `location`, `starting_price`
- `lead_message_seeds` (short outreach starters per recommended vendor)

## Deterministic Guardrails

- Keep ranking deterministic for identical inputs:
  - fixed scoring weights: `rating 0.4`, `price_fit 0.3`, `distance 0.2`, `availability 0.1`
  - stable sorting by `score DESC`, then `vendor_id ASC` as tie-breaker
- Enforce category coverage first:
  - fill one recommended vendor per required category when available
  - then fill additional ranked vendors up to a hard max of 6
- Never fabricate vendors, prices, reviews, ratings, or availability.
- If marketplace candidates are empty, return fallback vendors explicitly marked as fallback-origin behavior.
- Keep rationale numeric, concise, and explainable; no free-form speculative claims.
- Keep outputs marketplace-safe:
  - no promises of booking guarantees
  - no claims of verified availability beyond known response-time heuristics

## Execution Steps

1. Derive required categories from `event.event_type`.
2. Normalize vendor candidates and review aggregates.
3. Compute per-vendor deterministic score and rationale.
4. Build coverage-first recommended list, then ranked fill to 6.
5. Emit `lead_message_seeds` for recommended vendors using neutral host-safe copy.
6. Return only contract keys; avoid shape drift.

## Wired Skills

- `vendor-matching`
- `lead-generation`
- `vendor-comparison`
