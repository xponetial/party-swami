# admin-growth-agent build note

## Skill contract

- Agent id: `admin-growth-agent`
- Mission: produce deterministic growth and monetization insights from Party Swami platform + marketplace signals.
- Assignment alignment: `trend-analysis`, `monetization-strategy`, `opportunity-scoring` (per `docs/strategy/agent-skill-assignment.yaml`).
- Scope boundary: admin growth intelligence only; no consumer content generation.

## Expected inputs

- `time_window`: `{ start_date, end_date, timezone }`
- `metrics_snapshot`: usage, conversion, retention, and revenue counters/rates
- `marketplace_snapshot`: vendor supply and demand quality metrics
- `segments` (optional): channel/cohort partitions
- `constraints` (optional): policy/pricing/inventory limits

## Expected outputs

Stable top-level keys:
- `trend_summary`
- `opportunity_scoring`
- `monetization_recommendations`
- `deterministic_notes`

Output expectations:
- deterministic ordering (highest impact first)
- explicit numeric scoring for opportunities (`0-100`)
- action-oriented monetization recommendations with impact/risk tags
- missing-data handling through `insufficient_data` and note flags

## Deterministic guardrails

- No fabricated external facts; use provided input signals only.
- Same input must return same score/order outputs.
- Missing metrics must downgrade confidence instead of triggering guesswork.
- Prioritize marketplace-aligned outcomes (GMV quality, conversion quality, retention, attach rate).
- Recommend staged, testable actions before broad rollout changes.

## Mapped code wiring points

From `docs/strategy/brain-agent-wiring-contract.md`:
- Current phase: future wiring target (`admin analytics insights`).
- Orchestration boundary:
  - `src/lib/ai/brain.ts`
  - `src/lib/ai/workflows.ts`
- API entry context for merged orchestration payloads:
  - `src/app/api/ai/one-click/route.ts`
  - `src/app/api/ai/plan-event/route.ts`
