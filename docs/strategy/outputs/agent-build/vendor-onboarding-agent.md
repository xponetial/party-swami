# Vendor Onboarding Agent Build Note

## Agent

- id: `vendor-onboarding-agent`
- scope: Dev/stage-safe vendor onboarding output shaping for marketplace listing quality

## Skill Contract

Source of truth: `.agents/skills/vendor-onboarding-agent/SKILL.md`

This skill is responsible for deterministic vendor onboarding outputs in four blocks:

1. `profile_audit`
2. `normalized_packages`
3. `listing_readiness`
4. `recommended_actions`

The skill is constrained to assignment YAML capabilities only:

- `profile-optimization`
- `package-normalization`
- `listing-quality-audit`

## Expected Inputs

Structured onboarding payload with vendor profile, package list, optional assets, and constraints:

- `vendor`: identity, category, location, service coverage, description, experience, contact
- `packages[]`: package names, price/currency, duration, inclusions, add-ons
- `assets`: evidence/media pointers used for readiness checks
- `constraints`: deterministic controls such as max recommendation count

## Expected Outputs

Deterministic JSON with fixed top-level keys and stable enums.

- `profile_audit`: quality score/status, missing fields, quality flags
- `normalized_packages`: standardized package tiers and deliverables
- `listing_readiness`: ready boolean, blocking issues, warnings
- `recommended_actions`: prioritized bounded list of onboarding next steps

## Deterministic Guardrails

- JSON-only output and fixed key ordering.
- No fabricated claims (certifications, licensing, insurance coverage, performance metrics).
- Bounded recommendations (default max 5, from constraints when present).
- Stable enums for status/priority/tier to keep downstream parsing predictable.
- Missing required fields must force `listing_readiness.ready=false` with explicit blocking issues.
- Marketplace-aligned decisions only (trust, completeness, bookability).

## Mapped Code Wiring Points

Aligned with strategy docs:

- Assignment: `docs/strategy/agent-skill-assignment.yaml`
  - maps `vendor-onboarding-agent` to marketplace profile/package/listing quality skills
- Wiring contract: `docs/strategy/brain-agent-wiring-contract.md`
  - identifies vendor onboarding as a primary marketplace onboarding target (future AI wrapper)
- Current integration surfaces for brain orchestration and future registration:
  - `src/lib/ai/brain.ts`
  - `src/lib/ai/workflows.ts`
  - `src/app/api/ai/one-click/route.ts`
  - `src/app/api/ai/plan-event/route.ts`

## Notes

- This build note intentionally avoids production deployment/config concerns and is safe for dev/stage validation workflows.
- No other agent skill files are modified by this build pass.
