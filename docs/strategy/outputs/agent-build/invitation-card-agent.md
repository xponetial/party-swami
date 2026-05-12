# Invitation Card Agent Build Note (dev)

## Skill Contract

`invitation-card-agent` is responsible for invitation messaging outputs only. It converts event + invite context into deterministic invite copy artifacts aligned with Party Swami's marketplace-hosted planning experience.

## Expected Inputs

Required:
- `eventId` (UUID)
- Event seed context resolved internally (title, type, date/time, location, theme)

Optional:
- Existing invite design fields (`title`, `subtitle`, `dateText`, `locationText`, `currentMessage`)
- Tone preference when supplied by caller

## Expected Outputs

Required:
- `inviteCopy: string`

Optional extended fields (when requested by orchestrator/caller):
- `rsvpWording: string`
- `cardVariants: string[]`
- `imagePrompt: string`
- `layoutHints: string[]`
- `themeStylingHints: string[]`

## Deterministic Guardrails

- Never invent factual event details.
- Keep language concise, neutral-safe, and RSVP-focused.
- Avoid vendor promises, pricing claims, or non-factual guarantees.
- Maintain stable output key names and shape.
- On insufficient context, fail with bounded error messaging rather than speculative content.
- Keep messaging marketplace-aligned (host workflow utility over novelty prose).

## Mapped Code Wiring Points

Primary:
- `src/lib/ai/workflows.ts` -> `generateInviteCopyForEvent(...)`

API support:
- `src/app/api/ai/generate-invite-copy/route.ts` (`POST`)

Orchestrator alignment:
- `docs/strategy/agent-skill-assignment.yaml` (`invitation-card-agent` skill map)
- `docs/strategy/brain-agent-wiring-contract.md` (invite-copy wiring + parallel-safe set)

## Dev-Only Build Intent

This note is for dev/stage validation flow only. No production deploy, production alias, or production config changes are included.
