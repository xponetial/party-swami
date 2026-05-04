Phase 0: Foundations + Orchestrator Contract

Goal:
- Define shared contracts and guardrails before parallel feature work.

Deliver:
1. Agent contract spec (inputs/outputs/errors/trace IDs).
2. Skill contract spec aligned to `.agents/skills/<skill-name>/SKILL.md`.
3. Orchestrator routing policy for Party Swami flows.
4. Validation checklist for deterministic and non-hallucinated outputs.

Constraints:
- Stay inside Party Swami repo.
- Optimize for compatibility with current Next.js app and Supabase-backed architecture.

Write your output to:
- docs/strategy/outputs/phase-00-foundation.md
