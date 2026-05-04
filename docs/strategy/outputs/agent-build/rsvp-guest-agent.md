# RSVP Guest Agent Build Note

## Skill Contract

Agent: `rsvp-guest-agent`

Owned capabilities:
- `rsvp-tracking`
- `guest-segmentation`
- `guest-communication`

Contract guarantees:
- deterministic JSON output with stable top-level keys
- no direct DB writes or side effects
- status normalization to `confirmed | pending | declined`
- plus-one projection counts only for `confirmed`

## Expected Inputs

Required:
- `event`: `{ id, title, event_type, event_date?, location?, guest_target? }`
- `guests`: `{ id, name, status, plus_one_count?, email?, phone?, updated_at? }[]`
- `now_iso`: ISO timestamp

Optional:
- `invite`: `{ id?, send_state?, public_slug? }`
- `message_history`: communication metadata
- `filters`: segment and recommendation shaping options

## Expected Outputs

Stable JSON keys:
- `rsvp_summary`
  - `counts`
  - `plus_one_totals`
  - `coverage`
- `guest_segments[]`
  - `{ segment_key, label, criteria, guest_ids, count, priority }`
- `communication_recommendations[]`
  - `{ segment_key, objective, channel, template, cta, send_window_label }`
- `host_actions[]`
  - `{ action_key, label, reason, related_segment_key? }`

Error shape:
- `error_code`: `RSVP_AGENT_INVALID_INPUT`
- `error_message`
- keep all non-error output keys with safe empty defaults

## Deterministic Guardrails

- never depend on non-input state
- stable ordering for segments/actions
- no markdown in agent payloads
- bounded recommendation count (default 3-5)
- do not fabricate contact channels unavailable for a guest segment

## Mapped Code Wiring Points

Primary current RSVP/guest system wiring:
- [src/app/api/rsvp/route.ts](C:/Users/xpone/apps/party-swami/src/app/api/rsvp/route.ts): public RSVP POST contract and normalization
- [src/app/rsvp/[slug]/actions.ts](C:/Users/xpone/apps/party-swami/src/app/rsvp/[slug]/actions.ts): server action path for RSVP submissions
- [src/components/rsvp/public-rsvp-form.tsx](C:/Users/xpone/apps/party-swami/src/components/rsvp/public-rsvp-form.tsx): guest-facing RSVP status and plus-one UX
- [src/components/guests/event-guests-workspace.tsx](C:/Users/xpone/apps/party-swami/src/components/guests/event-guests-workspace.tsx): host guest management shell
- [src/types/guest.ts](C:/Users/xpone/apps/party-swami/src/types/guest.ts): canonical guest status typing

Brain strategy alignment points:
- [docs/strategy/agent-skill-assignment.yaml](C:/Users/xpone/apps/party-swami/docs/strategy/agent-skill-assignment.yaml): rsvp-guest-agent skill ownership
- [docs/strategy/brain-agent-wiring-contract.md](C:/Users/xpone/apps/party-swami/docs/strategy/brain-agent-wiring-contract.md): orchestration/wiring contract; RSVP AI layer marked as additive over guest flows
- [src/lib/ai/brain.ts](C:/Users/xpone/apps/party-swami/src/lib/ai/brain.ts): future `agentRegistry`/invocation metadata integration target
- [src/lib/ai/workflows.ts](C:/Users/xpone/apps/party-swami/src/lib/ai/workflows.ts): future merge target for deterministic guest intelligence in workflow payloads
