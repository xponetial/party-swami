# social-media-agent build note

## Skill contract

- Agent id: `social-media-agent`
- Owned skills:
  - `social-content`
  - `campaign-strategy`
- Role: deterministic generation of social campaign strategy and channel-ready drafts for Party Swami growth.
- Scope boundary: no ownership of planning, shopping, budget, RSVP, or vendor matching execution.

## Expected inputs

- `event_context`: normalized event descriptors used for audience/tone fit.
- `marketplace_context`: vendor categories/offers to align social hooks with marketplace inventory.
- `campaign_request`: objective, channels, cadence, and tone.
- `constraints`: locale/timezone and deterministic variant limits.

## Expected outputs

- `campaign_summary`
- `content_calendar`
- `channel_drafts`
- `marketplace_hooks`
- `compliance`

Output shape must remain stable for merge safety in orchestrated responses.

## Deterministic guardrails

- No fabricated claims, metrics, or pricing.
- No channel expansion beyond explicit request.
- Stable ordering:
  - `content_calendar`: `day_index` asc, then `channel` asc.
  - `channel_drafts` key order fixed: `instagram`, `facebook`, `tiktok`, `pinterest`, `x`.
- Respect `max_variants_per_post` exactly.
- On invalid input, return `error.code = INVALID_INPUT` with `missing_fields` list.

## Mapped wiring points

Based on:
- `docs/strategy/agent-skill-assignment.yaml`
- `docs/strategy/brain-agent-wiring-contract.md`

Current contract state:
- Primary target: growth content pipeline (future phase).

Implementation targets:
- `src/lib/ai/brain.ts`
  - add/extend `agentRegistry` entry for `social-media-agent`
  - enforce deterministic invocation metadata
- `src/lib/ai/workflows.ts`
  - add workflow wrapper for social campaign generation
- `src/app/api/ai/one-click/route.ts`
  - include optional social payload section in merged response when requested

## Marketplace alignment note

All generated content should drive marketplace actions (discover vendors, compare packages, start AI plan) rather than generic event-only engagement.