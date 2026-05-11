Environment Target: stage

Rules:
- Work for stage only.
- Do not do production deploys, production aliases, or production config changes.
- Keep behavior safe for dev/stage validation first.

Build and refine Party Swami agent skill: party-planning-agent

Goals:
1. Improve .agents/skills/party-planning-agent/SKILL.md for production-quality clarity.
2. Keep scope to this agent only (do not edit other agent skill files).
3. Ensure skill aligns with docs/strategy/agent-skill-assignment.yaml and docs/strategy/brain-agent-wiring-contract.md.
4. Add or update a concise build note in docs/strategy/outputs/agent-build/party-planning-agent.md describing:
   - skill contract
   - expected inputs/outputs
   - deterministic guardrails
   - mapped code wiring points

Constraints:
- Stay inside Party Swami repository only.
- Do not change files owned by other agent tasks.
- Keep outputs deterministic and marketplace-aligned.

Deliverables:
- Updated .agents/skills/party-planning-agent/SKILL.md
- Build note at docs/strategy/outputs/agent-build/party-planning-agent.md

