# Party Swami Strict Fit Model

## Objective

Define a strict fit model from strategy docs to current implementation so we can:
1. Build all agents.
2. Create all skills.
3. Assign skills to agents.
4. Wire agents to the existing AI brain.
5. Add a brain skill that knows all agents.

## Fit Matrix

| Capability | Strategy Docs Expectation | Current Code Reality | Fit | Gap to Close |
|---|---|---|---|---|
| AI Brain core orchestration | One-click plan across timeline/shopping/vendors/budget | `generateAiBrainPlanForEvent` + `/api/ai/one-click` exist | High | Formalize agent registry + skill routing |
| Planning agent behavior | Party Planning Agent primary brain | Planning exists through workflows/brain modules | Medium-High | Expose as explicit agent contract |
| Invitation agent behavior | Invite copy/card design/RSVP wording | Invite copy/image endpoints exist | Medium | Consolidate into single invitation agent contract |
| Shopping agent behavior | Category+quantity+affiliate outputs | Shopping generation and affiliate click tracking exist | High | Add explicit skill boundary and deterministic schema checks |
| Budget agent behavior | Budget allocation and adjustments | Budget allocator and endpoint exist | High | Add rationale and policy layer for adjustments |
| Task/reminder agent behavior | Task and timeline execution | Timeline/task sync exists | Medium-High | Add reminder strategy contract and escalation rules |
| RSVP/guest agent behavior | Segmentation + reminders | RSVP flows and guest tooling exist | Medium | Add AI segmentation/communication skill contract |
| Vendor marketplace agent | Vendor matching/scoring/leads | Vendor matching endpoint exists | Medium-High | Add lead packet generation and ranking explainability contract |
| Vendor onboarding agent | Supply-side profile optimization | Marketplace onboarding exists, not as AI agent | Medium-Low | Add onboarding agent outputs and templates |
| Social/media + admin growth agents | Growth automation and trend analysis | Analytics/admin present, limited autonomous growth actions | Medium-Low | Add growth skill pipeline + campaign outputs |
| Skill system | Reusable composable skills under `.agents/skills` | Not yet present in repo | Low | Create skill library, assignments, and standards |
| Brain knows agents | Explicit orchestrator skill and agent registry | Implicit orchestration in code | Medium | Add orchestrator skill + registry + wiring map |

## Strict Conclusion

The strategy documents **make sense** for Party Swami and match current direction, but they are currently **architecture-ahead** in two areas:
1. Explicit agentization (current system is module orchestration, not fully separated agents).
2. Formal skill layer (current behavior is encoded in app logic, not an explicit skills catalog).

## Build Order (Strict)

1. Create skill library and agent profiles under `.agents/skills`.
2. Add agent-to-skill assignment map.
3. Add brain orchestrator skill and registry contract.
4. Wire registry contracts to existing brain entrypoints (`plan-event`, `one-click`, `shopping`, `vendors`, `budget`).
5. Add contract tests for deterministic payloads and handoff safety.

## Definition of Done

1. Every target agent has a skill profile.
2. Every named skill from PRD2 is represented in the skill catalog.
3. Assignment map is complete (no unowned skill, no skill without consumer).
4. Brain orchestrator skill references all agents and dispatch policy.
5. Wiring map points each agent to concrete code/API paths in this repo.

